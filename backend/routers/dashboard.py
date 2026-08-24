"""
Phase 2 — Dashboard home: KPIs + chart data endpoints.
All endpoints are protected (require a valid JWT).
"""
from fastapi import APIRouter, Depends, HTTPException

from core.database import run_query, run_query_one
from core.security import require_roles

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(require_roles("analyst", "admin"))])


def _num(v):
    """Coerce Decimal/None from SQL results into a plain float for JSON."""
    return float(v) if v is not None else 0.0


@router.get("/kpis")
def get_kpis():
    try:
        row = run_query_one("""
            SELECT
              COALESCE(SUM(amount_billed), 0) AS total_revenue,
              COALESCE(SUM(amount_paid), 0)   AS total_collected,
              COALESCE(SUM(outstanding), 0)   AS outstanding,
              COUNT(DISTINCT patient_id)      AS total_patients
            FROM fact_billing
        """)
        total_revenue = _num(row["total_revenue"])
        outstanding = _num(row["outstanding"])
        outstanding_pct = (outstanding / total_revenue * 100) if total_revenue > 0 else 0.0

        return {
            "total_revenue": total_revenue,
            "total_collected": _num(row["total_collected"]),
            "outstanding": outstanding,
            "outstanding_pct": round(outstanding_pct, 2),
            "total_patients": int(row["total_patients"] or 0),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load KPIs: {exc}")


@router.get("/revenue-by-dept")
def revenue_by_dept():
    try:
        rows = run_query("""
            SELECT d.dept_name, SUM(f.amount_billed) AS revenue
            FROM fact_billing f
            JOIN dim_department d ON f.dept_id = d.dept_id
            GROUP BY d.dept_name
            ORDER BY revenue DESC
        """)
        return [{"dept_name": r["dept_name"], "revenue": _num(r["revenue"])} for r in rows]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load revenue by department: {exc}")


@router.get("/monthly-trend")
def monthly_trend():
    try:
        rows = run_query("""
            SELECT month_name, month_number, year, SUM(total_billed) AS revenue
            FROM v_revenue_by_dept_month
            GROUP BY month_name, month_number, year
            ORDER BY year, month_number
        """)
        return [
            {
                "month_name": r["month_name"],
                "year": int(r["year"]),
                "label": f"{r['month_name']} {r['year']}",
                "revenue": _num(r["revenue"]),
            }
            for r in rows
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load monthly trend: {exc}")


@router.get("/visit-types")
def visit_types():
    try:
        rows = run_query("""
            SELECT visit_type, COUNT(*) AS count
            FROM fact_billing
            GROUP BY visit_type
            ORDER BY count DESC
        """)
        return [{"visit_type": r["visit_type"], "count": int(r["count"])} for r in rows]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load visit types: {exc}")


@router.get("/payment-modes")
def payment_modes():
    try:
        rows = run_query("""
            SELECT payment_mode, COUNT(*) AS count
            FROM fact_billing
            GROUP BY payment_mode
            ORDER BY count DESC
        """)
        return [{"payment_mode": r["payment_mode"], "count": int(r["count"])} for r in rows]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load payment modes: {exc}")


@router.get("/age-groups")
def age_groups():
    try:
        rows = run_query("""
            SELECT p.age_group, COUNT(*) AS count
            FROM fact_billing f
            JOIN dim_patient p ON f.patient_id = p.patient_id
            GROUP BY p.age_group
            ORDER BY p.age_group
        """)
        return [{"age_group": r["age_group"], "count": int(r["count"])} for r in rows]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load age groups: {exc}")


@router.get("/summary-stats")
def summary_stats():
    try:
        most_visited_dept = run_query_one("""
            SELECT d.dept_name, COUNT(*) AS visits
            FROM fact_billing f
            JOIN dim_department d ON f.dept_id = d.dept_id
            GROUP BY d.dept_name
            ORDER BY visits DESC
            LIMIT 1
        """)
        top_treatment = run_query_one("""
            SELECT t.treatment_name, SUM(f.amount_billed) AS revenue
            FROM fact_billing f
            JOIN dim_treatment t ON f.treatment_id = t.treatment_id
            GROUP BY t.treatment_name
            ORDER BY revenue DESC
            LIMIT 1
        """)
        top_cluster = run_query_one("""
            SELECT cluster_name, COUNT(*) AS patient_count
            FROM mining_clusters
            GROUP BY cluster_name
            ORDER BY patient_count DESC
            LIMIT 1
        """)

        return {
            "most_visited_dept": {
                "name": most_visited_dept["dept_name"] if most_visited_dept else "N/A",
                "visits": int(most_visited_dept["visits"]) if most_visited_dept else 0,
            },
            "top_treatment": {
                "name": top_treatment["treatment_name"] if top_treatment else "N/A",
                "revenue": _num(top_treatment["revenue"]) if top_treatment else 0.0,
            },
            "top_cluster": {
                "name": top_cluster["cluster_name"] if top_cluster else "N/A",
                "patient_count": int(top_cluster["patient_count"]) if top_cluster else 0,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load summary stats: {exc}")
