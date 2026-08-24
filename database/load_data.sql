-- ============================================
-- Direct CSV Import (Backup for KNIME ETL)
-- Run AFTER schema.sql and AFTER generate_data.py
-- Usage: psql adaptive_bi < load_data.sql
-- NOTE: Update the path to match where your CSV files are
-- ============================================

-- Set the path to your data directory
-- Replace '/path/to/your/data' with actual path, e.g.:
-- Windows: 'C:/Users/krish/adaptive-bi/database/data'
-- Linux/Mac: '/home/krish/adaptive-bi/database/data'

\set data_dir '/path/to/your/adaptive-bi/database/data'

-- Clear existing data
TRUNCATE TABLE fact_billing CASCADE;
TRUNCATE TABLE dim_time CASCADE;
TRUNCATE TABLE dim_treatment CASCADE;
TRUNCATE TABLE dim_department CASCADE;
TRUNCATE TABLE dim_doctor CASCADE;
TRUNCATE TABLE dim_patient CASCADE;

-- Load dimension tables first
\copy dim_patient FROM :data_dir'/patients.csv' WITH (FORMAT csv, HEADER true);
\copy dim_doctor FROM :data_dir'/doctors.csv' WITH (FORMAT csv, HEADER true);
\copy dim_department FROM :data_dir'/departments.csv' WITH (FORMAT csv, HEADER true);
\copy dim_treatment FROM :data_dir'/treatments.csv' WITH (FORMAT csv, HEADER true);
\copy dim_time FROM :data_dir'/time_dimension.csv' WITH (FORMAT csv, HEADER true);

-- Load fact table last (depends on all dimensions)
\copy fact_billing FROM :data_dir'/transactions.csv' WITH (FORMAT csv, HEADER true);

-- Reset sequences
SELECT setval('dim_patient_patient_id_seq', (SELECT MAX(patient_id) FROM dim_patient));
SELECT setval('dim_doctor_doctor_id_seq', (SELECT MAX(doctor_id) FROM dim_doctor));
SELECT setval('dim_department_dept_id_seq', (SELECT MAX(dept_id) FROM dim_department));
SELECT setval('dim_treatment_treatment_id_seq', (SELECT MAX(treatment_id) FROM dim_treatment));
SELECT setval('dim_time_time_id_seq', (SELECT MAX(time_id) FROM dim_time));
SELECT setval('fact_billing_billing_id_seq', (SELECT MAX(billing_id) FROM fact_billing));

-- Verify
SELECT 'dim_patient' AS table_name, COUNT(*) AS row_count FROM dim_patient
UNION ALL SELECT 'dim_doctor', COUNT(*) FROM dim_doctor
UNION ALL SELECT 'dim_department', COUNT(*) FROM dim_department
UNION ALL SELECT 'dim_treatment', COUNT(*) FROM dim_treatment
UNION ALL SELECT 'dim_time', COUNT(*) FROM dim_time
UNION ALL SELECT 'fact_billing', COUNT(*) FROM fact_billing;
