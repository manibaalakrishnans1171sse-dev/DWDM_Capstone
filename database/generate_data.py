"""
Adaptive BI - Synthetic Hospital Data Generator
Generates realistic hospital operations data for the star schema.
Output: 5 CSV files in ./data/ folder

Run: pip install faker --break-system-packages
     python generate_data.py
"""

import csv
import os
import random
from datetime import datetime, timedelta

try:
    from faker import Faker
except ImportError:
    print("Installing faker...")
    os.system("pip install faker --break-system-packages")
    from faker import Faker

fake = Faker('en_IN')  # Indian locale for realistic names/cities
random.seed(42)
Faker.seed(42)

OUTPUT_DIR = "./data"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================
# CONFIGURATION
# ============================================
NUM_PATIENTS = 2000
NUM_DOCTORS = 150
NUM_TRANSACTIONS = 20000
DATE_START = datetime(2022, 1, 1)
DATE_END = datetime(2024, 12, 31)

# ============================================
# REFERENCE DATA
# ============================================

DEPARTMENTS = [
    {"dept_name": "Cardiology",       "floor": 3, "building": "Main Block",      "category": "Medical"},
    {"dept_name": "Orthopedics",      "floor": 2, "building": "Main Block",      "category": "Surgical"},
    {"dept_name": "Neurology",        "floor": 4, "building": "Specialty Wing",  "category": "Medical"},
    {"dept_name": "Pediatrics",       "floor": 1, "building": "Main Block",      "category": "Medical"},
    {"dept_name": "General Surgery",  "floor": 2, "building": "Main Block",      "category": "Surgical"},
    {"dept_name": "Dermatology",      "floor": 1, "building": "Specialty Wing",  "category": "Medical"},
    {"dept_name": "Ophthalmology",    "floor": 3, "building": "Specialty Wing",  "category": "Surgical"},
    {"dept_name": "ENT",              "floor": 3, "building": "Specialty Wing",  "category": "Surgical"},
    {"dept_name": "Radiology",        "floor": 0, "building": "Main Block",      "category": "Diagnostic"},
    {"dept_name": "Pathology",        "floor": 0, "building": "Main Block",      "category": "Diagnostic"},
    {"dept_name": "Emergency",        "floor": 0, "building": "Emergency Block", "category": "Emergency"},
    {"dept_name": "Gynecology",       "floor": 2, "building": "Specialty Wing",  "category": "Medical"},
]

SPECIALIZATIONS = {
    "Cardiology":      ["Interventional Cardiology", "Electrophysiology", "General Cardiology"],
    "Orthopedics":     ["Joint Replacement", "Spine Surgery", "Sports Medicine"],
    "Neurology":       ["Epilepsy", "Stroke", "General Neurology"],
    "Pediatrics":      ["Neonatology", "Pediatric Surgery", "General Pediatrics"],
    "General Surgery": ["Laparoscopic Surgery", "Trauma Surgery", "General Surgery"],
    "Dermatology":     ["Cosmetic Dermatology", "Clinical Dermatology"],
    "Ophthalmology":   ["Cataract Surgery", "Retina", "General Ophthalmology"],
    "ENT":             ["Otology", "Rhinology", "Head & Neck Surgery"],
    "Radiology":       ["CT/MRI", "Ultrasound", "Interventional Radiology"],
    "Pathology":       ["Histopathology", "Clinical Pathology", "Microbiology"],
    "Emergency":       ["Emergency Medicine", "Critical Care"],
    "Gynecology":      ["Obstetrics", "Reproductive Medicine", "General Gynecology"],
}

TREATMENTS = [
    # Surgery
    {"name": "Coronary Bypass Surgery",    "category": "Surgery",      "base_cost": 350000, "risk": "High"},
    {"name": "Hip Replacement",            "category": "Surgery",      "base_cost": 280000, "risk": "High"},
    {"name": "Knee Replacement",           "category": "Surgery",      "base_cost": 250000, "risk": "High"},
    {"name": "Appendectomy",               "category": "Surgery",      "base_cost": 80000,  "risk": "Medium"},
    {"name": "Cataract Surgery",           "category": "Surgery",      "base_cost": 45000,  "risk": "Low"},
    {"name": "Cesarean Section",           "category": "Surgery",      "base_cost": 120000, "risk": "Medium"},
    {"name": "Hernia Repair",              "category": "Surgery",      "base_cost": 60000,  "risk": "Low"},
    {"name": "Tonsillectomy",              "category": "Surgery",      "base_cost": 35000,  "risk": "Low"},
    # Consultation
    {"name": "General Consultation",       "category": "Consultation", "base_cost": 500,    "risk": "Low"},
    {"name": "Specialist Consultation",    "category": "Consultation", "base_cost": 1500,   "risk": "Low"},
    {"name": "Follow-up Visit",            "category": "Consultation", "base_cost": 300,    "risk": "Low"},
    {"name": "Telemedicine Consultation",  "category": "Consultation", "base_cost": 400,    "risk": "Low"},
    {"name": "Second Opinion",             "category": "Consultation", "base_cost": 2000,   "risk": "Low"},
    # Lab Test
    {"name": "Complete Blood Count",       "category": "Lab Test",     "base_cost": 600,    "risk": "Low"},
    {"name": "Lipid Profile",              "category": "Lab Test",     "base_cost": 800,    "risk": "Low"},
    {"name": "Thyroid Panel",              "category": "Lab Test",     "base_cost": 1200,   "risk": "Low"},
    {"name": "Blood Sugar (Fasting)",      "category": "Lab Test",     "base_cost": 200,    "risk": "Low"},
    {"name": "Liver Function Test",        "category": "Lab Test",     "base_cost": 900,    "risk": "Low"},
    {"name": "Kidney Function Test",       "category": "Lab Test",     "base_cost": 1000,   "risk": "Low"},
    {"name": "Urine Analysis",             "category": "Lab Test",     "base_cost": 300,    "risk": "Low"},
    {"name": "COVID-19 RT-PCR",            "category": "Lab Test",     "base_cost": 500,    "risk": "Low"},
    # Pharmacy
    {"name": "Prescription Medication",    "category": "Pharmacy",     "base_cost": 1500,   "risk": "Low"},
    {"name": "IV Medication",              "category": "Pharmacy",     "base_cost": 3000,   "risk": "Medium"},
    {"name": "Vaccination",                "category": "Pharmacy",     "base_cost": 800,    "risk": "Low"},
    # Emergency
    {"name": "Emergency Room Visit",       "category": "Emergency",    "base_cost": 5000,   "risk": "Medium"},
    {"name": "Trauma Care",               "category": "Emergency",    "base_cost": 25000,  "risk": "High"},
    {"name": "ICU Admission",             "category": "Emergency",    "base_cost": 50000,  "risk": "High"},
    # Procedure
    {"name": "ECG",                        "category": "Procedure",    "base_cost": 500,    "risk": "Low"},
    {"name": "Echocardiogram",             "category": "Procedure",    "base_cost": 3000,   "risk": "Low"},
    {"name": "X-Ray",                      "category": "Procedure",    "base_cost": 800,    "risk": "Low"},
    {"name": "CT Scan",                    "category": "Procedure",    "base_cost": 5000,   "risk": "Low"},
    {"name": "MRI Scan",                   "category": "Procedure",    "base_cost": 8000,   "risk": "Low"},
    {"name": "Ultrasound",                 "category": "Procedure",    "base_cost": 1500,   "risk": "Low"},
    {"name": "Endoscopy",                  "category": "Procedure",    "base_cost": 6000,   "risk": "Medium"},
    {"name": "Colonoscopy",               "category": "Procedure",    "base_cost": 8000,   "risk": "Medium"},
    {"name": "Physiotherapy Session",      "category": "Procedure",    "base_cost": 1000,   "risk": "Low"},
    {"name": "Dialysis",                   "category": "Procedure",    "base_cost": 4000,   "risk": "Medium"},
]

INDIAN_STATES_CITIES = {
    "Tamil Nadu":     ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
    "Karnataka":      ["Bangalore", "Mysore", "Hubli"],
    "Kerala":         ["Kochi", "Thiruvananthapuram", "Kozhikode"],
    "Andhra Pradesh": ["Hyderabad", "Visakhapatnam", "Vijayawada"],
    "Maharashtra":    ["Mumbai", "Pune", "Nagpur"],
    "Delhi":          ["New Delhi"],
}

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
INSURANCE_TYPES = ["Government", "Private", "Self-Pay", "Corporate"]
QUALIFICATIONS = ["MBBS", "MD", "MS", "DM", "MCh", "MBBS MD", "MBBS MS"]
VISIT_TYPES = ["Outpatient", "Inpatient", "Emergency"]
PAYMENT_MODES = ["Cash", "Card", "Insurance", "UPI", "Online"]


def age_group(age):
    if age < 18:
        return "Pediatric"
    elif age < 35:
        return "Young Adult"
    elif age < 60:
        return "Adult"
    else:
        return "Senior"


def generate_patients():
    """Generate dim_patient data."""
    patients = []
    for i in range(1, NUM_PATIENTS + 1):
        gender = random.choice(["Male", "Female"])
        name = fake.name_male() if gender == "Male" else fake.name_female()
        age = random.choices(
            range(1, 90),
            weights=[1]*5 + [2]*13 + [5]*17 + [8]*25 + [6]*15 + [3]*14,
            k=1
        )[0]
        state = random.choices(
            list(INDIAN_STATES_CITIES.keys()),
            weights=[40, 15, 10, 15, 15, 5],  # Bias toward Tamil Nadu
            k=1
        )[0]
        city = random.choice(INDIAN_STATES_CITIES[state])
        patients.append({
            "patient_id": i,
            "patient_name": name,
            "age": age,
            "age_group": age_group(age),
            "gender": gender,
            "blood_group": random.choice(BLOOD_GROUPS),
            "city": city,
            "state": state,
            "insurance_type": random.choices(
                INSURANCE_TYPES,
                weights=[25, 30, 30, 15],
                k=1
            )[0],
        })
    return patients


def generate_doctors():
    """Generate dim_doctor data."""
    doctors = []
    doc_id = 1
    for dept in DEPARTMENTS:
        dept_name = dept["dept_name"]
        specs = SPECIALIZATIONS[dept_name]
        # 10-15 doctors per department
        num_docs = random.randint(10, 15)
        for _ in range(num_docs):
            gender = random.choice(["Male", "Female"])
            name = "Dr. " + (fake.name_male() if gender == "Male" else fake.name_female())
            doctors.append({
                "doctor_id": doc_id,
                "doctor_name": name,
                "specialization": random.choice(specs),
                "department": dept_name,
                "experience_yrs": random.randint(2, 30),
                "qualification": random.choice(QUALIFICATIONS),
            })
            doc_id += 1
            if doc_id > NUM_DOCTORS:
                break
        if doc_id > NUM_DOCTORS:
            break
    return doctors


def generate_departments():
    """Generate dim_department data."""
    departments = []
    for i, dept in enumerate(DEPARTMENTS, 1):
        departments.append({
            "dept_id": i,
            "dept_name": dept["dept_name"],
            "floor_number": dept["floor"],
            "building": dept["building"],
            "category": dept["category"],
        })
    return departments


def generate_treatments():
    """Generate dim_treatment data."""
    treatments = []
    for i, t in enumerate(TREATMENTS, 1):
        treatments.append({
            "treatment_id": i,
            "treatment_name": t["name"],
            "category": t["category"],
            "base_cost": t["base_cost"],
            "risk_level": t["risk"],
        })
    return treatments


def generate_time_dimension():
    """Generate dim_time for entire date range."""
    times = []
    current = DATE_START
    time_id = 1
    while current <= DATE_END:
        times.append({
            "time_id": time_id,
            "full_date": current.strftime("%Y-%m-%d"),
            "day_of_month": current.day,
            "day_name": current.strftime("%A"),
            "month_number": current.month,
            "month_name": current.strftime("%B"),
            "quarter": (current.month - 1) // 3 + 1,
            "year": current.year,
            "is_weekend": current.weekday() >= 5,
        })
        time_id += 1
        current += timedelta(days=1)
    return times


def generate_transactions(patients, doctors, departments, treatments, times):
    """Generate fact_billing data with realistic patterns."""
    # Build lookup maps
    dept_doctors = {}
    for doc in doctors:
        dept_doctors.setdefault(doc["department"], []).append(doc["doctor_id"])

    # Treatment-department affinity (which treatments happen in which departments)
    treatment_dept_map = {}
    for t in treatments:
        if t["category"] == "Surgery":
            depts = ["General Surgery", "Orthopedics", "Ophthalmology", "ENT", "Gynecology"]
        elif t["category"] == "Lab Test":
            depts = ["Pathology"]
        elif t["category"] == "Emergency":
            depts = ["Emergency"]
        elif t["category"] == "Procedure":
            if t["treatment_name"] in ["ECG", "Echocardiogram"]:
                depts = ["Cardiology"]
            elif t["treatment_name"] in ["X-Ray", "CT Scan", "MRI Scan", "Ultrasound"]:
                depts = ["Radiology"]
            else:
                depts = [random.choice([d["dept_name"] for d in departments if d["category"] != "Diagnostic"])]
        else:
            depts = [d["dept_name"] for d in departments if d["category"] != "Diagnostic"]
        treatment_dept_map[t["treatment_id"]] = depts

    date_to_time_id = {t["full_date"]: t["time_id"] for t in times}

    transactions = []
    for i in range(1, NUM_TRANSACTIONS + 1):
        patient = random.choice(patients)
        treatment = random.choice(treatments)

        # Pick department based on treatment affinity
        valid_depts = treatment_dept_map.get(treatment["treatment_id"], ["General Surgery"])
        dept_name = random.choice(valid_depts)
        dept = next((d for d in departments if d["dept_name"] == dept_name), departments[0])

        # Pick doctor from that department
        doc_ids = dept_doctors.get(dept_name, [doctors[0]["doctor_id"]])
        doctor_id = random.choice(doc_ids)

        # Random date with seasonal bias (more visits in winter/monsoon)
        days_range = (DATE_END - DATE_START).days
        day_offset = random.randint(0, days_range)
        visit_date = DATE_START + timedelta(days=day_offset)
        month = visit_date.month

        # Seasonal multiplier: more visits in July-Sept (monsoon) and Dec-Jan (winter)
        seasonal_boost = 1.0
        if month in [7, 8, 9]:
            seasonal_boost = 1.3
        elif month in [12, 1]:
            seasonal_boost = 1.2
        if random.random() > seasonal_boost / 1.3:
            continue  # Skip some to create seasonal pattern

        date_str = visit_date.strftime("%Y-%m-%d")
        time_id = date_to_time_id.get(date_str)
        if not time_id:
            continue

        # Visit type based on treatment
        if treatment["category"] == "Emergency":
            visit_type = "Emergency"
        elif treatment["category"] == "Surgery":
            visit_type = "Inpatient"
        else:
            visit_type = random.choices(
                ["Outpatient", "Inpatient"],
                weights=[80, 20],
                k=1
            )[0]

        # Billing with realistic variation
        base = treatment["base_cost"]
        variation = random.uniform(0.8, 1.5)
        amount_billed = round(base * variation, 2)

        # Payment based on insurance type
        if patient["insurance_type"] == "Self-Pay":
            pay_ratio = random.uniform(0.5, 1.0)
        elif patient["insurance_type"] in ["Government", "Corporate"]:
            pay_ratio = random.uniform(0.8, 1.0)
        else:
            pay_ratio = random.uniform(0.6, 1.0)

        amount_paid = round(amount_billed * pay_ratio, 2)
        outstanding = round(amount_billed - amount_paid, 2)

        # Length of stay
        if visit_type == "Outpatient":
            los = 0
        elif treatment["category"] == "Surgery":
            los = random.randint(3, 15)
        elif visit_type == "Emergency":
            los = random.randint(1, 7)
        else:
            los = random.randint(1, 5)

        payment_mode = random.choices(
            PAYMENT_MODES,
            weights=[15, 20, 35, 20, 10],
            k=1
        )[0]

        transactions.append({
            "billing_id": i,
            "patient_id": patient["patient_id"],
            "doctor_id": doctor_id,
            "dept_id": dept["dept_id"],
            "treatment_id": treatment["treatment_id"],
            "time_id": time_id,
            "amount_billed": amount_billed,
            "amount_paid": amount_paid,
            "outstanding": outstanding,
            "length_of_stay": los,
            "visit_type": visit_type,
            "payment_mode": payment_mode,
        })

        if len(transactions) >= NUM_TRANSACTIONS:
            break

    return transactions


def write_csv(filename, data, fieldnames):
    """Write list of dicts to CSV."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    print(f"  Written: {filepath} ({len(data)} rows)")


def main():
    print("Generating synthetic hospital data...")
    print()

    patients = generate_patients()
    write_csv("patients.csv", patients,
              ["patient_id", "patient_name", "age", "age_group", "gender",
               "blood_group", "city", "state", "insurance_type"])

    doctors = generate_doctors()
    write_csv("doctors.csv", doctors,
              ["doctor_id", "doctor_name", "specialization", "department",
               "experience_yrs", "qualification"])

    departments = generate_departments()
    write_csv("departments.csv", departments,
              ["dept_id", "dept_name", "floor_number", "building", "category"])

    treatments = generate_treatments()
    write_csv("treatments.csv", treatments,
              ["treatment_id", "treatment_name", "category", "base_cost", "risk_level"])

    times = generate_time_dimension()
    write_csv("time_dimension.csv", times,
              ["time_id", "full_date", "day_of_month", "day_name", "month_number",
               "month_name", "quarter", "year", "is_weekend"])

    transactions = generate_transactions(patients, doctors, departments, treatments, times)
    write_csv("transactions.csv", transactions,
              ["billing_id", "patient_id", "doctor_id", "dept_id", "treatment_id",
               "time_id", "amount_billed", "amount_paid", "outstanding",
               "length_of_stay", "visit_type", "payment_mode"])

    print()
    print(f"Done! All CSV files saved to {OUTPUT_DIR}/")
    print(f"Total transactions: {len(transactions)}")
    print()
    print("Next steps:")
    print("  1. Create PostgreSQL database: createdb adaptive_bi")
    print("  2. Run schema: psql adaptive_bi < schema.sql")
    print("  3. Load CSVs via KNIME ETL workflow (or use load_data.sql)")


if __name__ == "__main__":
    main()
