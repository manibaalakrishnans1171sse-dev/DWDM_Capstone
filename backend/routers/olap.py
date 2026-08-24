"""
Phase 3 — OLAP Cube: per-axis-label drill info for the 3D cube's click interaction.
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from core.database import run_query_one
from core.security import require_roles

router = APIRouter(prefix="/olap", tags=["olap"], dependencies=[Depends(require_roles("analyst", "admin"))])

DEPARTMENT_DESCRIPTIONS = {
    "Cardiology": "Cardiology handles heart-related treatments — from diagnostics like ECG to procedures like bypass surgery.",
    "Orthopedics": "Orthopedics treats bone, joint, and musculoskeletal conditions, including fractures and surgery.",
    "Neurology": "Neurology diagnoses and treats disorders of the brain, spine, and nervous system.",
    "Radiology": "Radiology provides imaging-based diagnostics — X-ray, CT, MRI, and ultrasound.",
    "Emergency": "Emergency handles acute, time-critical cases requiring immediate attention.",
    "Pathology": "Pathology runs lab tests and diagnostic analysis on patient samples.",
}

TREATMENT_CATEGORY_DESCRIPTIONS = {
    "Surgery": "Surgical procedures, ranging from minor operations to major invasive surgery.",
    "Lab Test": "Diagnostic laboratory testing — blood work, screening panels, and pathology tests.",
    "Consultation": "Doctor consultations and outpatient advisory visits.",
    "Emergency": "Emergency and trauma care treatments requiring immediate intervention.",
    "Pharmacy": "Medication dispensing and pharmacy-billed items.",
    "Procedure": "Non-surgical medical procedures performed by clinical staff.",
}


def _num(v):
    return round(float(v), 2) if v is not None else 0.0


def _base_stats(where_clause: str, params: dict):
    row = run_query_one(f"""
        SELECT
          COALESCE(SUM(f.amount_billed), 0) AS total_revenue,
          COUNT(*) AS visit_count,
          COALESCE(AVG(f.amount_billed), 0) AS avg_billing
        FROM fact_billing f
        JOIN dim_department d ON f.dept_id = d.dept_id
        JOIN dim_treatment t ON f.treatment_id = t.treatment_id
        JOIN dim_time tm ON f.time_id = tm.time_id
        {where_clause}
    """, params)

    top = run_query_one(f"""
        SELECT t.treatment_name, SUM(f.amount_billed) AS revenue
        FROM fact_billing f
        JOIN dim_department d ON f.dept_id = d.dept_id
        JOIN dim_treatment t ON f.treatment_id = t.treatment_id
        JOIN dim_time tm ON f.time_id = tm.time_id
        {where_clause}
        GROUP BY t.treatment_name
        ORDER BY revenue DESC
        LIMIT 1
    """, params)

    return row, top


@router.get("/dimension-info")
def dimension_info(
    dimension: str = Query(..., pattern="^(department|time|treatment_category)$"),
    value: str = Query(..., min_length=1, max_length=100),
):
    try:
        if dimension == "department":
            row, top = _base_stats("WHERE d.dept_name = :value", {"value": value})
            description = DEPARTMENT_DESCRIPTIONS.get(
                value, f"{value} department of the hospital."
            )
            label_type = "Department Dimension"

        elif dimension == "treatment_category":
            row, top = _base_stats("WHERE t.category = :value", {"value": value})
            description = TREATMENT_CATEGORY_DESCRIPTIONS.get(
                value, f"{value} category of treatments."
            )
            label_type = "Treatment Category Dimension"

        else:  # time, expects "Q1-2026" style labels
            try:
                quarter_part, year_part = value.split("-")
                quarter = int(quarter_part.replace("Q", ""))
                year = int(year_part)
            except (ValueError, IndexError):
                raise HTTPException(status_code=400, detail="Time value must look like 'Q1-2026'")

            row, top = _base_stats(
                "WHERE tm.quarter = :quarter AND tm.year = :year",
                {"quarter": quarter, "year": year},
            )
            description = f"Billing activity during Quarter {quarter} of {year}."
            label_type = "Time Dimension"

        return {
            "label": value,
            "dimension_type": label_type,
            "total_revenue": _num(row["total_revenue"]) if row else 0.0,
            "visit_count": int(row["visit_count"]) if row else 0,
            "avg_billing": _num(row["avg_billing"]) if row else 0.0,
            "top_treatment": top["treatment_name"] if top else "N/A",
            "description": description,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load dimension info: {exc}")
