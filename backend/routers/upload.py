"""
Phase 9 — Upload Dataset: CSV goes to KNIME's input folder, a KNIME batch
workflow does ETL + mining, and this endpoint loads KNIME's output CSVs back
into PostgreSQL. Python does not run any ML itself in this pipeline.
"""
import io
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import text

from core.database import engine, run_query
from core.security import require_roles
from ml.knime_runner import save_upload_csv, run_knime_workflow, load_knime_outputs, KnimeRunError

router = APIRouter(prefix="/upload", tags=["upload"], dependencies=[Depends(require_roles("analyst", "admin"))])

REQUIRED_COLUMNS = [
    "patient_id", "doctor_id", "dept_id", "treatment_id", "time_id",
    "amount_billed", "amount_paid", "outstanding", "length_of_stay",
    "visit_type", "payment_mode",
]

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024


def _row_dict(row):
    """pandas Series -> plain-Python dict (numpy int64/float64 aren't adaptable by psycopg2)."""
    result = {}
    for k, v in row.to_dict().items():
        if pd.isna(v):
            result[k] = None
        elif hasattr(v, "item"):
            result[k] = v.item()
        else:
            result[k] = v
    return result


def _record_history(filename, rows_inserted, dt_accuracy, kmeans_silhouette, rules_found, status):
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO upload_history (filename, rows_inserted, dt_accuracy, kmeans_silhouette, rules_found, status)
            VALUES (:filename, :rows_inserted, :dt_accuracy, :kmeans_silhouette, :rules_found, :status)
        """), {
            "filename": filename,
            "rows_inserted": rows_inserted,
            "dt_accuracy": dt_accuracy,
            "kmeans_silhouette": kmeans_silhouette,
            "rules_found": rules_found,
            "status": status,
        })


STEP_LABELS = {
    1: "Saving CSV for KNIME processing",
    2: "KNIME ETL workflow running",
    3: "KNIME K-Means clustering running",
    4: "KNIME Decision Tree running",
    5: "KNIME Association Rules running",
    6: "Loading KNIME results to database",
    7: "Dashboard updated — open Tableau to refresh visualization",
}


@router.post("/dataset")
async def upload_dataset(file: UploadFile = File(...)):
    steps = []

    def step(n, ok, detail=""):
        steps.append({"step": n, "label": STEP_LABELS[n], "status": "success" if ok else "error", "detail": detail})

    def skip_rest(from_step):
        for n in range(from_step, 8):
            steps.append({"step": n, "label": STEP_LABELS[n], "status": "skipped", "detail": "Not reached"})

    # --- Validate file type/size/columns before touching KNIME at all ---
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds the 50MB limit")

    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}")

    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required columns: {missing_cols}",
        )

    # --- Step 1: save for KNIME ---
    try:
        save_upload_csv(df)
        step(1, True, f"{len(df)} rows written to KNIME input folder")
    except KnimeRunError as exc:
        step(1, False, str(exc))
        skip_rest(2)
        _record_history(file.filename, 0, None, None, None, "failed")
        raise HTTPException(status_code=500, detail={"message": str(exc), "steps": steps})

    # --- Steps 2-5: one blocking KNIME batch call covers the whole workflow,
    # so all four either succeed together or fail together. ---
    try:
        run_knime_workflow()
        for n in (2, 3, 4, 5):
            step(n, True, "Completed as part of the KNIME batch workflow run")
    except KnimeRunError as exc:
        step(2, False, str(exc))
        skip_rest(3)
        _record_history(file.filename, 0, None, None, None, "failed")
        raise HTTPException(status_code=503, detail={"message": str(exc), "steps": steps})

    # --- Step 6: load KNIME's output CSVs ---
    try:
        outputs = load_knime_outputs()
    except KnimeRunError as exc:
        step(6, False, str(exc))
        skip_rest(7)
        _record_history(file.filename, 0, None, None, None, "failed")
        raise HTTPException(status_code=500, detail={"message": str(exc), "steps": steps})

    try:
        with engine.begin() as conn:
            clusters_df = outputs["clusters"]
            conn.execute(text("DELETE FROM mining_clusters"))
            for _, r in clusters_df.iterrows():
                conn.execute(text("""
                    INSERT INTO mining_clusters (patient_id, cluster_label, cluster_name, total_spent, visit_count, avg_stay)
                    VALUES (:patient_id, :cluster_label, :cluster_name, :total_spent, :visit_count, :avg_stay)
                """), _row_dict(r))

            dt_df = outputs["decision_tree"]
            conn.execute(text("DELETE FROM mining_decision_tree"))
            for _, r in dt_df.iterrows():
                conn.execute(text("""
                    INSERT INTO mining_decision_tree (patient_id, predicted_class, confidence, actual_class)
                    VALUES (:patient_id, :predicted_class, :confidence, :actual_class)
                """), _row_dict(r))

            ar_df = outputs["association_rules"]
            conn.execute(text("DELETE FROM mining_associations"))
            for _, r in ar_df.iterrows():
                conn.execute(text("""
                    INSERT INTO mining_associations (antecedent, consequent, support, confidence, lift)
                    VALUES (:antecedent, :consequent, :support, :confidence, :lift)
                """), _row_dict(r))

            metrics_df = outputs["model_metrics"]
            for _, r in metrics_df.iterrows():
                conn.execute(text("""
                    INSERT INTO model_log (model_name, run_timestamp, accuracy, silhouette, num_rules, rows_trained, notes)
                    VALUES (:model_name, :run_timestamp, :accuracy, :silhouette, :num_rules, :rows_trained, :notes)
                """), {**_row_dict(r), "run_timestamp": datetime.utcnow()})

        rows_inserted = int(outputs["rows_inserted"])
        metrics_by_model = {row["model_name"]: _row_dict(row) for _, row in outputs["model_metrics"].iterrows()}
        dt_accuracy = metrics_by_model.get("decision_tree", {}).get("accuracy")
        kmeans_silhouette = metrics_by_model.get("kmeans", {}).get("silhouette")
        rules_found = len(outputs["association_rules"])

        step(6, True, f"{len(clusters_df)} clusters, {len(dt_df)} predictions, {rules_found} rules")
    except Exception as exc:
        step(6, False, str(exc))
        skip_rest(7)
        _record_history(file.filename, 0, None, None, None, "failed")
        raise HTTPException(status_code=500, detail={"message": str(exc), "steps": steps})

    step(7, True)

    _record_history(file.filename, rows_inserted, dt_accuracy, kmeans_silhouette, rules_found, "success")

    return {
        "steps": steps,
        "rows_inserted": rows_inserted,
        "dt_accuracy": dt_accuracy,
        "kmeans_silhouette": kmeans_silhouette,
        "rules_found": rules_found,
    }


@router.get("/history")
def upload_history():
    try:
        rows = run_query("""
            SELECT upload_id, filename, upload_datetime, rows_inserted, dt_accuracy, kmeans_silhouette, rules_found, status
            FROM upload_history
            ORDER BY upload_datetime DESC
        """)
        return [
            {
                "upload_id": r["upload_id"],
                "filename": r["filename"],
                "upload_datetime": r["upload_datetime"].isoformat() if r["upload_datetime"] else None,
                "rows_inserted": r["rows_inserted"],
                "dt_accuracy": float(r["dt_accuracy"]) if r["dt_accuracy"] is not None else None,
                "kmeans_silhouette": float(r["kmeans_silhouette"]) if r["kmeans_silhouette"] is not None else None,
                "rules_found": r["rules_found"],
                "status": r["status"],
            }
            for r in rows
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load upload history: {exc}")
