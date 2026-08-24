"""
Phase 4 — Data Tables browser: paginated/searchable/sortable view over any
whitelisted table or view. table_name is always validated against a fixed
whitelist before being interpolated into SQL (never trust user input as an
identifier), and column names used for sort/search are validated against the
table's real information_schema columns for the same reason.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text

from core.database import engine, run_query
from core.security import require_roles

router = APIRouter(prefix="/tables", tags=["tables"], dependencies=[Depends(require_roles("analyst", "admin"))])

TABLE_WHITELIST = [
    "dim_patient", "dim_doctor", "dim_department", "dim_treatment", "dim_time",
    "fact_billing", "mining_associations", "mining_clusters", "mining_decision_tree",
    "model_log", "v_olap_cube", "v_patient_summary", "v_revenue_by_dept_month",
]

VIEW_NAMES = {"v_olap_cube", "v_patient_summary", "v_revenue_by_dept_month"}


def _validate_table(table_name: str) -> str:
    if table_name not in TABLE_WHITELIST:
        raise HTTPException(status_code=400, detail=f"Unknown or disallowed table: {table_name}")
    return table_name


def _get_columns(table_name: str):
    rows = run_query("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = :t
        ORDER BY ordinal_position
    """, {"t": table_name})
    if not rows:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found in database")
    return rows


def _badge_type(data_type: str) -> str:
    dt = data_type.lower()
    if "int" in dt or dt == "bigint" or dt == "smallint":
        return "INT"
    if "numeric" in dt or "double" in dt or "real" in dt or "decimal" in dt:
        return "NUMERIC"
    if "timestamp" in dt or dt == "date":
        return "DATE"
    if "bool" in dt:
        return "BOOLEAN"
    return "VARCHAR"


@router.get("/list")
def list_tables():
    try:
        result = []
        with engine.connect() as conn:
            for name in TABLE_WHITELIST:
                try:
                    count = conn.execute(text(f'SELECT COUNT(*) FROM "{name}"')).scalar()
                except Exception:
                    count = 0
                result.append({
                    "name": name,
                    "is_view": name in VIEW_NAMES,
                    "row_count": count,
                })
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to list tables: {exc}")


@router.get("/{table_name}")
def get_table_data(
    table_name: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=5000),
    search: str = Query("", max_length=200),
    sort_col: str = Query("", max_length=100),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
):
    try:
        table_name = _validate_table(table_name)
        col_meta = _get_columns(table_name)
        col_names = [c["column_name"] for c in col_meta]
        columns = [{"name": c["column_name"], "type": _badge_type(c["data_type"])} for c in col_meta]

        where_clause = ""
        params = {}
        if search:
            search_parts = [f'CAST("{c}" AS TEXT) ILIKE :search' for c in col_names]
            where_clause = "WHERE " + " OR ".join(search_parts)
            params["search"] = f"%{search}%"

        order_clause = ""
        if sort_col and sort_col in col_names:
            direction = "ASC" if sort_dir == "asc" else "DESC"
            order_clause = f'ORDER BY "{sort_col}" {direction}'

        with engine.connect() as conn:
            total_count = conn.execute(
                text(f'SELECT COUNT(*) FROM "{table_name}" {where_clause}'), params
            ).scalar()

            offset = (page - 1) * page_size
            data_sql = f'SELECT * FROM "{table_name}" {where_clause} {order_clause} LIMIT :limit OFFSET :offset'
            result = conn.execute(text(data_sql), {**params, "limit": page_size, "offset": offset})
            rows = [list(row) for row in result.fetchall()]

        # JSON-safe coercion (Decimal, date, datetime -> float/str)
        def coerce(v):
            if v is None:
                return None
            if hasattr(v, "isoformat"):
                return v.isoformat()
            if isinstance(v, (str, int, float, bool)):
                return v
            try:
                return float(v)
            except (TypeError, ValueError):
                return str(v)

        rows = [[coerce(v) for v in row] for row in rows]

        return {
            "columns": columns,
            "rows": rows,
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load table '{table_name}': {exc}")
