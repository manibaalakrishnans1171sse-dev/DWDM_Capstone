"""
Export Adaptive BI warehouse data to CSV for Tableau.

Connects to PostgreSQL and writes four flat CSVs into exports/ (created
alongside the project root if it doesn't already exist):

    1. revenue_by_dept_month.csv - v_revenue_by_dept_month view, as-is
    2. department_performance.csv - revenue/volume/stay per department
    3. patient_demographics.csv   - patient counts by age group/gender/insurance
    4. treatment_analysis.csv     - revenue/volume per treatment

Run from anywhere:

    python database/export_for_tableau.py
"""

import os

import pandas as pd
import psycopg2

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

EXPORT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "exports")

QUERIES = {
    "revenue_by_dept_month.csv": """
        SELECT *
        FROM v_revenue_by_dept_month;
    """,
    "department_performance.csv": """
        SELECT
            d.dept_name,
            SUM(f.amount_billed) AS total_revenue,
            COUNT(*) AS patient_count,
            AVG(f.length_of_stay) AS avg_stay
        FROM fact_billing f
        JOIN dim_department d ON f.dept_id = d.dept_id
        GROUP BY d.dept_name;
    """,
    "patient_demographics.csv": """
        SELECT
            age_group,
            gender,
            insurance_type,
            COUNT(*) AS count
        FROM dim_patient
        GROUP BY age_group, gender, insurance_type;
    """,
    "treatment_analysis.csv": """
        SELECT
            t.treatment_name,
            t.category,
            COUNT(*) AS transaction_count,
            SUM(f.amount_billed) AS total_revenue
        FROM fact_billing f
        JOIN dim_treatment t ON f.treatment_id = t.treatment_id
        GROUP BY t.treatment_name, t.category;
    """,
}


def main():
    os.makedirs(EXPORT_DIR, exist_ok=True)

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        for filename, query in QUERIES.items():
            df = pd.read_sql(query, conn)
            out_path = os.path.join(EXPORT_DIR, filename)
            df.to_csv(out_path, index=False)
            print(f"  + wrote {len(df)} rows -> {out_path}")
    finally:
        conn.close()

    print("\nDone - all CSVs exported for Tableau.")


if __name__ == "__main__":
    main()
