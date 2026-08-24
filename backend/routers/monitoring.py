"""
Phase 8 — Monitoring: model_log history and latest-run stats per model.
Each row in model_log represents one KNIME pipeline execution.
"""
from fastapi import APIRouter, Depends, HTTPException

from core.database import run_query
from core.security import require_roles

router = APIRouter(prefix="/monitoring", tags=["monitoring"], dependencies=[Depends(require_roles("analyst", "admin"))])


def _num(v):
    return float(v) if v is not None else None


@router.get("/model-log")
def model_log():
    try:
        rows = run_query("""
            SELECT log_id, model_name, run_timestamp, accuracy, silhouette, num_rules, rows_trained, notes
            FROM model_log
            ORDER BY run_timestamp
        """)
        return [
            {
                "log_id": r["log_id"],
                "model_name": r["model_name"],
                "run_timestamp": r["run_timestamp"].isoformat() if r["run_timestamp"] else None,
                "accuracy": _num(r["accuracy"]),
                "silhouette": _num(r["silhouette"]),
                "num_rules": r["num_rules"],
                "rows_trained": r["rows_trained"],
                "notes": r["notes"],
            }
            for r in rows
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load model log: {exc}")


@router.get("/latest-stats")
def latest_stats():
    try:
        def latest(model_name: str):
            row = run_query("""
                SELECT model_name, run_timestamp, accuracy, silhouette, num_rules, rows_trained
                FROM model_log
                WHERE model_name = :name
                ORDER BY run_timestamp DESC
                LIMIT 1
            """, {"name": model_name})
            return row[0] if row else None

        dt = latest("decision_tree")
        km = latest("kmeans")
        ar = latest("association_rules")

        return {
            "decision_tree": {
                "accuracy": _num(dt["accuracy"]) if dt else None,
                "rows_trained": dt["rows_trained"] if dt else None,
                "last_run": dt["run_timestamp"].isoformat() if dt and dt["run_timestamp"] else None,
            },
            "kmeans": {
                "silhouette": _num(km["silhouette"]) if km else None,
                "rows_trained": km["rows_trained"] if km else None,
                "last_run": km["run_timestamp"].isoformat() if km and km["run_timestamp"] else None,
            },
            "association_rules": {
                "num_rules": ar["num_rules"] if ar else None,
                "rows_trained": ar["rows_trained"] if ar else None,
                "last_run": ar["run_timestamp"].isoformat() if ar and ar["run_timestamp"] else None,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load latest stats: {exc}")
