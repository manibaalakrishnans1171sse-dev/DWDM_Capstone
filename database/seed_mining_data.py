"""
Seed the Adaptive BI mining tables with realistic demo data derived from
the patients and billing already in the database:

    1. mining_decision_tree  - one "outstanding balance" prediction per
       sampled patient, generated from a priority rule cascade
    2. mining_clusters       - every patient assigned to one of 5 named
       segments, using v_patient_summary (falls back to aggregating
       fact_billing directly if that view isn't available)
    3. mining_associations   - 15 hand-authored, hospital-realistic rules
    4. model_log             - 8 runs across ~6 months showing each model
       type's metric improving over time

Existing rows in all four tables are cleared first, so this script is safe
to re-run. Run from anywhere:

    python database/seed_mining_data.py
"""

import os
import random
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": int(os.environ.get("DB_PORT", 5432)),
    "dbname": os.environ.get("DB_NAME", "adaptive_bi"),
    "user": os.environ.get("DB_USER", "postgres"),
    "password": os.environ.get("DB_PASSWORD"),
}

if not DB_CONFIG["password"]:
    raise RuntimeError(
        "DB_PASSWORD environment variable is not set. "
        "Set it (e.g. in backend/.env or your shell) before running this script."
    )

MINING_TABLES = ["mining_decision_tree", "mining_clusters", "mining_associations", "model_log"]

TARGET_PREDICTIONS = 2000
NOW = datetime.now()

random.seed(42)  # deterministic output across re-runs


def connect():
    return psycopg2.connect(**DB_CONFIG)


def clear_mining_tables(cur):
    for table in MINING_TABLES:
        cur.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY;")
    print(f"  - cleared {', '.join(MINING_TABLES)}")


# ---------------------------------------------------------------------------
# 1. mining_decision_tree
# ---------------------------------------------------------------------------

def outstanding_probability(insurance_type, age_group):
    """Priority rule cascade from the spec. Self-Pay is checked first since
    it's the strongest signal; Senior age next; Corporate/Government are the
    most reliably-paid group; everything else gets the baseline rate."""
    if insurance_type == "Self-Pay":
        return 0.70
    if age_group == "Senior":
        return 0.60
    if insurance_type in ("Corporate", "Government"):
        return 0.20
    return 0.40


def seed_decision_tree(cur):
    cur.execute("SELECT patient_id, age_group, insurance_type FROM dim_patient;")
    patients = cur.fetchall()
    if not patients:
        print("  ! dim_patient is empty, skipping mining_decision_tree")
        return

    # ~2000 rows: sample without replacement if there are enough patients;
    # otherwise sample with replacement (repeat predictions over time, each
    # with its own created_at, same as a model re-scoring the same patient
    # on a later run).
    if len(patients) >= TARGET_PREDICTIONS:
        sampled = random.sample(patients, TARGET_PREDICTIONS)
    else:
        sampled = [random.choice(patients) for _ in range(TARGET_PREDICTIONS)]

    window_days = 180  # matches the 6-month model_log window
    rows = []
    for p in sampled:
        p_outstanding = outstanding_probability(p["insurance_type"], p["age_group"])
        predicted_class = "Outstanding" if random.random() < p_outstanding else "Paid"

        # ~12% of predictions are still unresolved (bill not yet closed out);
        # of the rest, correctness is independent of the prediction rule
        # above and tuned directly to hit the ~78% accuracy target.
        if random.random() < 0.12:
            actual_class = None
        elif random.random() < 0.78:
            actual_class = predicted_class
        else:
            actual_class = "Paid" if predicted_class == "Outstanding" else "Outstanding"

        confidence = random.uniform(0.55, 0.98)
        if actual_class is not None:
            confidence += 0.04 if actual_class == predicted_class else -0.04
        confidence = round(min(0.98, max(0.55, confidence)), 3)

        created_at = NOW - timedelta(days=random.uniform(0, window_days))
        rows.append((p["patient_id"], predicted_class, confidence, actual_class, created_at))

    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO mining_decision_tree
            (patient_id, predicted_class, confidence, actual_class, created_at)
        VALUES %s
        """,
        rows,
    )

    labeled = [r for r in rows if r[3] is not None]
    correct = sum(1 for r in labeled if r[1] == r[3])
    accuracy = correct / len(labeled) if labeled else 0.0
    print(f"  + inserted {len(rows)} mining_decision_tree rows "
          f"({len(labeled)} labeled, accuracy {accuracy:.1%})")


# ---------------------------------------------------------------------------
# 2. mining_clusters
# ---------------------------------------------------------------------------

CLUSTER_NAMES = {
    0: "Low-Value Occasional",
    1: "Regular Outpatient",
    2: "High-Value Regular",
    3: "Emergency One-Time",
    4: "Premium Insured",
}

# insurance types treated as "well-insured" when splitting the high-spend,
# high-visit group between Cluster 2 (High-Value Regular) and Cluster 4
# (Premium Insured) — the spec assigns clusters from total_spent/visit_count,
# this is only the tiebreaker between two clusters that would otherwise tie.
INSURED_TYPES = ("Private", "Corporate", "Government")


def percentile(values, pct):
    """Linear-interpolated percentile with no numpy dependency."""
    if not values:
        return 0.0
    s = sorted(values)
    k = (len(s) - 1) * pct
    f = int(k)
    c = min(f + 1, len(s) - 1)
    if f == c:
        return s[f]
    return s[f] + (s[c] - s[f]) * (k - f)


def resolve_patient_summary(cur):
    """Return {patient_id: {total_spent, visit_count, avg_stay}}, preferring
    v_patient_summary but tolerating whatever it happens to name its columns
    -- and falling back to aggregating fact_billing directly if the view
    isn't queryable at all."""
    cur.execute("SAVEPOINT before_patient_summary;")
    try:
        cur.execute("SELECT * FROM v_patient_summary;")
        rows = cur.fetchall()
        cur.execute("RELEASE SAVEPOINT before_patient_summary;")
    except Exception as exc:
        cur.execute("ROLLBACK TO SAVEPOINT before_patient_summary;")
        print(f"  ! v_patient_summary unavailable ({exc}); aggregating fact_billing instead")
        cur.execute(
            """
            SELECT patient_id,
                   SUM(amount_billed) AS total_spent,
                   COUNT(*) AS visit_count,
                   AVG(length_of_stay) AS avg_stay
            FROM fact_billing
            GROUP BY patient_id;
            """
        )
        rows = cur.fetchall()

    if not rows:
        return {}

    colnames = list(rows[0].keys())

    def find(*candidates):
        for cand in candidates:
            for col in colnames:
                if col.lower() == cand:
                    return col
        for cand in candidates:
            for col in colnames:
                if cand in col.lower():
                    return col
        return None

    pid_col = find("patient_id")
    spend_col = find("total_spent", "total_billed", "total_amount", "amount_billed", "spent")
    visit_col = find("visit_count", "num_visits", "total_visits", "visits")
    stay_col = find("avg_stay", "avg_length_of_stay", "average_stay", "length_of_stay")

    if pid_col is None:
        raise RuntimeError("v_patient_summary (or its fallback) has no recognizable patient_id column")

    summary = {}
    for row in rows:
        summary[row[pid_col]] = {
            "total_spent": float(row[spend_col]) if spend_col and row[spend_col] is not None else 0.0,
            "visit_count": int(row[visit_col]) if visit_col and row[visit_col] is not None else 0,
            "avg_stay": float(row[stay_col]) if stay_col and row[stay_col] is not None else 0.0,
        }
    return summary


def assign_cluster(total_spent, visit_count, insurance_type, t):
    """Rule-based segmentation from total_spent / visit_count, using
    population quartiles (t) so the thresholds adapt to whatever's actually
    in the database instead of hardcoded dollar amounts or an absolute
    "1 visit" cutoff that might not exist in every dataset."""
    if visit_count == 0 and total_spent == 0:
        return 0  # no billing activity at all -> Low-Value Occasional
    if visit_count <= t["visit_p25"] and total_spent >= t["spend_p75"]:
        return 3  # few visits but a high total -> one costly episode -> Emergency One-Time
    if total_spent >= t["spend_p75"] and visit_count >= t["visit_p75"]:
        return 4 if insurance_type in INSURED_TYPES else 2
    if total_spent >= t["spend_p75"]:
        return 2  # High-Value Regular
    if visit_count >= t["visit_p75"] or (visit_count >= t["visit_p50"] and total_spent >= t["spend_p50"]):
        return 1  # Regular Outpatient
    return 0


def seed_clusters(cur):
    cur.execute("SELECT patient_id, insurance_type FROM dim_patient;")
    patients = cur.fetchall()
    if not patients:
        print("  ! dim_patient is empty, skipping mining_clusters")
        return

    summary = resolve_patient_summary(cur)
    spends = [s["total_spent"] for s in summary.values()]
    visits = [s["visit_count"] for s in summary.values()]
    thresholds = {
        "spend_p50": percentile(spends, 0.50),
        "spend_p75": percentile(spends, 0.75),
        "visit_p25": percentile(visits, 0.25),
        "visit_p50": percentile(visits, 0.50),
        "visit_p75": percentile(visits, 0.75),
    }

    counts = {label: 0 for label in CLUSTER_NAMES}
    rows = []
    for p in patients:
        s = summary.get(p["patient_id"], {"total_spent": 0.0, "visit_count": 0, "avg_stay": 0.0})
        label = assign_cluster(s["total_spent"], s["visit_count"], p["insurance_type"], thresholds)
        counts[label] += 1
        created_at = NOW - timedelta(days=random.uniform(0, 30))
        rows.append((
            p["patient_id"], label, CLUSTER_NAMES[label],
            round(s["total_spent"], 2), s["visit_count"], round(s["avg_stay"], 2),
            created_at,
        ))

    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO mining_clusters
            (patient_id, cluster_label, cluster_name, total_spent, visit_count, avg_stay, created_at)
        VALUES %s
        """,
        rows,
    )
    breakdown = ", ".join(f"{CLUSTER_NAMES[k]}={v}" for k, v in counts.items())
    print(f"  + inserted {len(rows)} mining_clusters rows -> {breakdown}")


# ---------------------------------------------------------------------------
# 3. mining_associations
# ---------------------------------------------------------------------------

# (antecedent items, consequent) - 15 hand-authored, hospital-plausible rules.
ASSOCIATION_RULES = [
    (["Lab Test", "Cardiology"], "ECG"),
    (["Diabetes Screening"], "HbA1c Test"),
    (["X-Ray"], "Orthopedic Consultation"),
    (["Emergency Visit"], "CT Scan"),
    (["Cardiology Consultation"], "Echocardiogram"),
    (["Physiotherapy"], "Follow-up Consultation"),
    (["Surgery"], "Post-Op Review"),
    (["Blood Test"], "Prescription"),
    (["MRI"], "Neurology Consultation"),
    (["Maternity Ward"], "Pediatric Checkup"),
    (["Diabetes", "Hypertension"], "Nephrology Consultation"),
    (["ICU Admission"], "Ventilator Support"),
    (["Dialysis"], "Nephrology Consultation"),
    (["Chemotherapy"], "Oncology Follow-up"),
    (["General Checkup"], "Blood Test"),
]


def seed_associations(cur):
    rows = []
    for antecedent_items, consequent in ASSOCIATION_RULES:
        antecedent = ", ".join(antecedent_items)
        support = round(random.uniform(0.05, 0.15), 3)
        confidence = round(random.uniform(0.30, 0.85), 3)
        lift = round(random.uniform(1.2, 3.5), 2)
        created_at = NOW - timedelta(days=random.uniform(0, 60))
        rows.append((antecedent, consequent, support, confidence, lift, created_at))

    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO mining_associations (antecedent, consequent, support, confidence, lift, created_at)
        VALUES %s
        """,
        rows,
    )
    print(f"  + inserted {len(rows)} mining_associations rows")


# ---------------------------------------------------------------------------
# 4. model_log
# ---------------------------------------------------------------------------

# (days_ago, model_name, accuracy, silhouette, num_rules, rows_trained, notes)
# 8 runs over ~6 months: decision_tree 0.72->0.78, kmeans 0.35->0.52,
# association_rules 12->18 rules, interleaved chronologically.
MODEL_LOG_ENTRIES = [
    (180, "decision_tree",     0.72, None, None, 3800, "Initial baseline model"),
    (154, "kmeans",            None, 0.35, None, 3800, "Initial 5-cluster segmentation"),
    (128, "association_rules", None, None, 12,   4100, "Initial rule mining, min_support=0.05"),
    (102, "decision_tree",     0.75, None, None, 4500, "Retrained with more billing history"),
    (77,  "kmeans",            None, 0.44, None, 4900, "Refined cluster boundaries"),
    (51,  "association_rules", None, None, 18,   5300, "Lowered min_support, more transactions"),
    (25,  "kmeans",            None, 0.52, None, 5700, "Stabilized segmentation"),
    (1,   "decision_tree",     0.78, None, None, 6100, "Feature tuning: added insurance_type"),
]


def seed_model_log(cur):
    rows = []
    for days_ago, model_name, accuracy, silhouette, num_rules, rows_trained, notes in MODEL_LOG_ENTRIES:
        run_timestamp = NOW - timedelta(days=days_ago)
        rows.append((model_name, run_timestamp, accuracy, silhouette, num_rules, rows_trained, notes))

    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO model_log
            (model_name, run_timestamp, accuracy, silhouette, num_rules, rows_trained, notes)
        VALUES %s
        """,
        rows,
    )
    print(f"  + inserted {len(rows)} model_log rows")


# ---------------------------------------------------------------------------

def print_final_counts(cur):
    print("\nFinal row counts:")
    for table in MINING_TABLES:
        cur.execute(f"SELECT COUNT(*) AS n FROM {table};")
        print(f"  {table}: {cur.fetchone()['n']}")


def main():
    conn = connect()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            print("Clearing existing mining data...")
            clear_mining_tables(cur)

            print("Seeding mining_decision_tree...")
            seed_decision_tree(cur)

            print("Seeding mining_clusters...")
            seed_clusters(cur)

            print("Seeding mining_associations...")
            seed_associations(cur)

            print("Seeding model_log...")
            seed_model_log(cur)

            print_final_counts(cur)

        conn.commit()
        print("\nDone - all mining tables seeded.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
