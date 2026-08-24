"""
Phase 3 — Schema info: static metadata describing the star/snowflake schema,
used by the frontend to render the ReactFlow diagrams. Also exposes the live
table/column list from information_schema for reference.
"""
from fastapi import APIRouter, Depends, HTTPException

from core.database import run_query
from core.security import require_roles

router = APIRouter(prefix="/schema", tags=["schema"], dependencies=[Depends(require_roles("analyst", "admin"))])

FACT_TABLE = {
    "name": "fact_billing",
    "columns": [
        "billing_id", "patient_id", "doctor_id", "dept_id", "treatment_id", "time_id",
        "amount_billed", "amount_paid", "outstanding", "length_of_stay", "visit_type", "payment_mode",
    ],
}

DIMENSIONS = [
    {"name": "dim_patient", "fk": "patient_id", "position": "top-left",
     "columns": ["patient_id", "patient_name", "age", "age_group", "gender", "blood_group", "city", "state", "insurance_type"]},
    {"name": "dim_doctor", "fk": "doctor_id", "position": "top-right",
     "columns": ["doctor_id", "doctor_name", "specialization", "department", "experience_yrs", "qualification"]},
    {"name": "dim_treatment", "fk": "treatment_id", "position": "bottom-right",
     "columns": ["treatment_id", "treatment_name", "category", "base_cost", "risk_level"]},
    {"name": "dim_department", "fk": "dept_id", "position": "bottom-left",
     "columns": ["dept_id", "dept_name", "floor_number", "building", "category"]},
    {"name": "dim_time", "fk": "time_id", "position": "top-center",
     "columns": ["time_id", "full_date", "day_of_month", "day_name", "month_number", "month_name", "quarter", "year", "is_weekend"]},
]

SUB_DIMENSIONS = [
    {"name": "dim_location", "parent": "dim_patient", "columns": ["city", "state", "blood_group"]},
    {"name": "dim_building", "parent": "dim_department", "columns": ["floor_number", "building"]},
    {"name": "dim_specialization", "parent": "dim_doctor", "columns": ["specialization", "qualification"]},
    {"name": "dim_category", "parent": "dim_treatment", "columns": ["category", "risk_level"]},
]


@router.get("/star-schema-info")
def star_schema_info():
    try:
        return {
            "fact": FACT_TABLE,
            "dimensions": DIMENSIONS,
            "sub_dimensions": SUB_DIMENSIONS,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load schema info: {exc}")


@router.get("/live-columns")
def live_columns():
    """Cross-check the static metadata above against the real database (information_schema)."""
    try:
        table_names = [FACT_TABLE["name"]] + [d["name"] for d in DIMENSIONS]
        rows = run_query("""
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ANY(:tables)
            ORDER BY table_name, ordinal_position
        """, {"tables": table_names})

        grouped = {}
        for r in rows:
            grouped.setdefault(r["table_name"], []).append(
                {"name": r["column_name"], "type": r["data_type"]}
            )
        return grouped
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load live columns: {exc}")
