-- ============================================
-- Adaptive BI - Hospital Operations Data Warehouse
-- Star Schema for PostgreSQL
-- ============================================

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS model_log CASCADE;
DROP TABLE IF EXISTS mining_associations CASCADE;
DROP TABLE IF EXISTS mining_clusters CASCADE;
DROP TABLE IF EXISTS mining_decision_tree CASCADE;
DROP TABLE IF EXISTS fact_billing CASCADE;
DROP TABLE IF EXISTS dim_time CASCADE;
DROP TABLE IF EXISTS dim_treatment CASCADE;
DROP TABLE IF EXISTS dim_department CASCADE;
DROP TABLE IF EXISTS dim_doctor CASCADE;
DROP TABLE IF EXISTS dim_patient CASCADE;

-- ============================================
-- DIMENSION TABLES
-- ============================================

-- Dimension: Patient
CREATE TABLE dim_patient (
    patient_id      SERIAL PRIMARY KEY,
    patient_name    VARCHAR(100) NOT NULL,
    age             INTEGER NOT NULL,
    age_group       VARCHAR(20) NOT NULL,  -- Pediatric, Young Adult, Adult, Senior
    gender          VARCHAR(10) NOT NULL,  -- Male, Female, Other
    blood_group     VARCHAR(5),            -- A+, B-, O+, AB+, etc.
    city            VARCHAR(50) NOT NULL,
    state           VARCHAR(50) NOT NULL,
    insurance_type  VARCHAR(30) NOT NULL   -- Government, Private, Self-Pay, Corporate
);

-- Dimension: Doctor
CREATE TABLE dim_doctor (
    doctor_id       SERIAL PRIMARY KEY,
    doctor_name     VARCHAR(100) NOT NULL,
    specialization  VARCHAR(50) NOT NULL,
    department      VARCHAR(50) NOT NULL,
    experience_yrs  INTEGER NOT NULL,
    qualification   VARCHAR(50) NOT NULL   -- MBBS, MD, MS, DM, MCh
);

-- Dimension: Department
CREATE TABLE dim_department (
    dept_id         SERIAL PRIMARY KEY,
    dept_name       VARCHAR(50) NOT NULL,
    floor_number    INTEGER NOT NULL,
    building        VARCHAR(30) NOT NULL,  -- Main Block, Specialty Wing, Emergency Block
    category        VARCHAR(20) NOT NULL   -- Surgical, Medical, Diagnostic, Emergency
);

-- Dimension: Treatment
CREATE TABLE dim_treatment (
    treatment_id    SERIAL PRIMARY KEY,
    treatment_name  VARCHAR(100) NOT NULL,
    category        VARCHAR(30) NOT NULL,  -- Surgery, Consultation, Lab Test, Pharmacy, Emergency, Procedure
    base_cost       DECIMAL(10, 2) NOT NULL,
    risk_level      VARCHAR(10) NOT NULL   -- Low, Medium, High
);

-- Dimension: Time
CREATE TABLE dim_time (
    time_id         SERIAL PRIMARY KEY,
    full_date       DATE NOT NULL UNIQUE,
    day_of_month    INTEGER NOT NULL,
    day_name        VARCHAR(10) NOT NULL,  -- Monday, Tuesday, etc.
    month_number    INTEGER NOT NULL,
    month_name      VARCHAR(10) NOT NULL,  -- January, February, etc.
    quarter         INTEGER NOT NULL,      -- 1, 2, 3, 4
    year            INTEGER NOT NULL,
    is_weekend      BOOLEAN NOT NULL
);

-- ============================================
-- FACT TABLE
-- ============================================

CREATE TABLE fact_billing (
    billing_id      SERIAL PRIMARY KEY,
    patient_id      INTEGER NOT NULL REFERENCES dim_patient(patient_id),
    doctor_id       INTEGER NOT NULL REFERENCES dim_doctor(doctor_id),
    dept_id         INTEGER NOT NULL REFERENCES dim_department(dept_id),
    treatment_id    INTEGER NOT NULL REFERENCES dim_treatment(treatment_id),
    time_id         INTEGER NOT NULL REFERENCES dim_time(time_id),

    -- Measures (what Mondrian aggregates)
    amount_billed   DECIMAL(12, 2) NOT NULL,
    amount_paid     DECIMAL(12, 2) NOT NULL,
    outstanding     DECIMAL(12, 2) NOT NULL,  -- billed - paid
    length_of_stay  INTEGER NOT NULL DEFAULT 0, -- days (0 for outpatient)
    visit_type      VARCHAR(15) NOT NULL,  -- Inpatient, Outpatient, Emergency
    payment_mode    VARCHAR(20) NOT NULL   -- Cash, Card, Insurance, UPI, Online
);

-- ============================================
-- MINING RESULT TABLES (KNIME writes here)
-- ============================================

-- Decision Tree predictions: will patient have outstanding balance?
CREATE TABLE mining_decision_tree (
    prediction_id   SERIAL PRIMARY KEY,
    patient_id      INTEGER REFERENCES dim_patient(patient_id),
    predicted_class VARCHAR(20) NOT NULL,  -- 'Outstanding' or 'Paid'
    confidence      DECIMAL(5, 4) NOT NULL, -- 0.0000 to 1.0000
    actual_class    VARCHAR(20),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- K-Means clustering: patient segments
CREATE TABLE mining_clusters (
    cluster_id      SERIAL PRIMARY KEY,
    patient_id      INTEGER REFERENCES dim_patient(patient_id),
    cluster_label   INTEGER NOT NULL,      -- 0, 1, 2, 3, 4
    cluster_name    VARCHAR(50),           -- e.g., 'High-Value Regular', 'Emergency One-Time'
    total_spent     DECIMAL(12, 2),
    visit_count     INTEGER,
    avg_stay        DECIMAL(5, 2),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Association Rules: treatment co-occurrence patterns
CREATE TABLE mining_associations (
    rule_id         SERIAL PRIMARY KEY,
    antecedent      VARCHAR(200) NOT NULL, -- e.g., 'Lab Test + Cardiology'
    consequent      VARCHAR(200) NOT NULL, -- e.g., 'ECG'
    support         DECIMAL(6, 4) NOT NULL,
    confidence      DECIMAL(6, 4) NOT NULL,
    lift            DECIMAL(8, 4) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model performance log: tracks "adaptive" retraining
CREATE TABLE model_log (
    log_id          SERIAL PRIMARY KEY,
    model_name      VARCHAR(50) NOT NULL,  -- 'decision_tree', 'kmeans', 'association'
    run_timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accuracy        DECIMAL(5, 4),         -- for decision tree
    silhouette      DECIMAL(5, 4),         -- for kmeans
    num_rules       INTEGER,               -- for association
    rows_trained    INTEGER NOT NULL,
    notes           TEXT
);

-- ============================================
-- INDEXES (Performance for OLAP queries)
-- ============================================

CREATE INDEX idx_fact_patient ON fact_billing(patient_id);
CREATE INDEX idx_fact_doctor ON fact_billing(doctor_id);
CREATE INDEX idx_fact_dept ON fact_billing(dept_id);
CREATE INDEX idx_fact_treatment ON fact_billing(treatment_id);
CREATE INDEX idx_fact_time ON fact_billing(time_id);
CREATE INDEX idx_fact_visit ON fact_billing(visit_type);
CREATE INDEX idx_time_year ON dim_time(year);
CREATE INDEX idx_time_quarter ON dim_time(quarter);
CREATE INDEX idx_time_month ON dim_time(month_number);
CREATE INDEX idx_time_date ON dim_time(full_date);
CREATE INDEX idx_patient_age_group ON dim_patient(age_group);
CREATE INDEX idx_patient_insurance ON dim_patient(insurance_type);
CREATE INDEX idx_doctor_dept ON dim_doctor(department);
CREATE INDEX idx_treatment_category ON dim_treatment(category);
CREATE INDEX idx_dept_category ON dim_department(category);

-- ============================================
-- USEFUL VIEWS (Flask backend reads these)
-- ============================================

-- Revenue by department by month (pre-aggregated for dashboard)
CREATE OR REPLACE VIEW v_revenue_by_dept_month AS
SELECT
    d.dept_name,
    t.year,
    t.month_number,
    t.month_name,
    SUM(f.amount_billed) AS total_billed,
    SUM(f.amount_paid) AS total_paid,
    SUM(f.outstanding) AS total_outstanding,
    COUNT(*) AS transaction_count,
    AVG(f.length_of_stay) AS avg_stay
FROM fact_billing f
JOIN dim_department d ON f.dept_id = d.dept_id
JOIN dim_time t ON f.time_id = t.time_id
GROUP BY d.dept_name, t.year, t.month_number, t.month_name;

-- Patient visit summary (for mining features)
CREATE OR REPLACE VIEW v_patient_summary AS
SELECT
    p.patient_id,
    p.patient_name,
    p.age_group,
    p.gender,
    p.insurance_type,
    COUNT(f.billing_id) AS total_visits,
    SUM(f.amount_billed) AS total_billed,
    SUM(f.amount_paid) AS total_paid,
    SUM(f.outstanding) AS total_outstanding,
    AVG(f.length_of_stay) AS avg_stay,
    MAX(t.full_date) AS last_visit
FROM dim_patient p
JOIN fact_billing f ON p.patient_id = f.patient_id
JOIN dim_time t ON f.time_id = t.time_id
GROUP BY p.patient_id, p.patient_name, p.age_group, p.gender, p.insurance_type;

-- OLAP cube aggregation using PostgreSQL CUBE (for backup if Mondrian is slow)
CREATE OR REPLACE VIEW v_olap_cube AS
SELECT
    COALESCE(d.dept_name, 'ALL') AS department,
    COALESCE(tr.category, 'ALL') AS treatment_category,
    COALESCE(t.year::TEXT, 'ALL') AS year,
    COALESCE(t.quarter::TEXT, 'ALL') AS quarter,
    SUM(f.amount_billed) AS total_revenue,
    SUM(f.amount_paid) AS total_collected,
    COUNT(*) AS visit_count,
    AVG(f.length_of_stay) AS avg_stay
FROM fact_billing f
JOIN dim_department d ON f.dept_id = d.dept_id
JOIN dim_treatment tr ON f.treatment_id = tr.treatment_id
JOIN dim_time t ON f.time_id = t.time_id
GROUP BY CUBE(d.dept_name, tr.category, t.year, t.quarter);
