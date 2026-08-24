"""
Phase 6 — Mining Results: association rules, patient clusters, decision tree predictions.
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from core.database import run_query, run_query_one
from core.security import require_roles

router = APIRouter(prefix="/mining", tags=["mining"], dependencies=[Depends(require_roles("analyst", "admin"))])


def _num(v):
    return float(v) if v is not None else 0.0


@router.get("/association-rules")
def association_rules():
    try:
        rows = run_query("""
            SELECT rule_id, antecedent, consequent, support, confidence, lift, created_at
            FROM mining_associations
            ORDER BY lift DESC
        """)
        return [
            {
                "rule_id": r["rule_id"],
                "antecedent": r["antecedent"],
                "consequent": r["consequent"],
                "support": _num(r["support"]),
                "confidence": _num(r["confidence"]),
                "confidence_pct": round(_num(r["confidence"]) * 100, 1),
                "lift": _num(r["lift"]),
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in rows
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load association rules: {exc}")


@router.get("/clusters")
def clusters():
    try:
        summary = run_query("""
            SELECT
              cluster_label,
              cluster_name,
              COUNT(*) AS patient_count,
              AVG(total_spent) AS avg_total_spent,
              AVG(visit_count) AS avg_visit_count,
              AVG(avg_stay) AS avg_avg_stay
            FROM mining_clusters
            GROUP BY cluster_label, cluster_name
            ORDER BY cluster_label
        """)
        return [
            {
                "cluster_label": r["cluster_label"],
                "cluster_name": r["cluster_name"],
                "patient_count": int(r["patient_count"]),
                "avg_total_spent": round(_num(r["avg_total_spent"]), 2),
                "avg_visit_count": round(_num(r["avg_visit_count"]), 2),
                "avg_avg_stay": round(_num(r["avg_avg_stay"]), 2),
            }
            for r in summary
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load clusters: {exc}")


@router.get("/decision-tree")
def decision_tree(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=200)):
    try:
        totals = run_query("""
            SELECT predicted_class, COUNT(*) AS count
            FROM mining_decision_tree
            GROUP BY predicted_class
        """)
        predicted_counts = {t["predicted_class"]: int(t["count"]) for t in totals}

        buckets = run_query("""
            SELECT
              CASE
                WHEN confidence >= 0.9 THEN '0.9-1.0'
                WHEN confidence >= 0.8 THEN '0.8-0.9'
                WHEN confidence >= 0.7 THEN '0.7-0.8'
                WHEN confidence >= 0.6 THEN '0.6-0.7'
                ELSE '0.5-0.6'
              END AS bucket,
              COUNT(*) AS count
            FROM mining_decision_tree
            GROUP BY bucket
        """)
        bucket_order = ["0.5-0.6", "0.6-0.7", "0.7-0.8", "0.8-0.9", "0.9-1.0"]
        bucket_map = {b["bucket"]: int(b["count"]) for b in buckets}
        confidence_distribution = [{"bucket": b, "count": bucket_map.get(b, 0)} for b in bucket_order]

        total_count = run_query_one("SELECT COUNT(*) AS c FROM mining_decision_tree")["c"]
        offset = (page - 1) * page_size
        rows = run_query("""
            SELECT prediction_id, patient_id, predicted_class, confidence, actual_class, created_at
            FROM mining_decision_tree
            ORDER BY prediction_id
            LIMIT :limit OFFSET :offset
        """, {"limit": page_size, "offset": offset})

        predictions = [
            {
                "prediction_id": r["prediction_id"],
                "patient_id": r["patient_id"],
                "predicted_class": r["predicted_class"],
                "confidence": _num(r["confidence"]),
                "confidence_pct": round(_num(r["confidence"]) * 100, 1),
                "actual_class": r["actual_class"],
                "match": r["predicted_class"] == r["actual_class"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in rows
        ]

        return {
            "predicted_paid": predicted_counts.get("Paid", 0),
            "predicted_outstanding": predicted_counts.get("Outstanding", 0),
            "confidence_distribution": confidence_distribution,
            "predictions": predictions,
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load decision tree results: {exc}")
