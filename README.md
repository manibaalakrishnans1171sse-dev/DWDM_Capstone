# Adaptive BI — Hospital Operations Intelligence System

A web platform that helps hospital administrators see what's happening across their departments in real time, and predicts problems before they show up in a monthly report.

## What This Project Does

Hospitals generate huge amounts of operational data every day — billing records, patient visits, treatment costs, department workloads — but most of that data just sits in a database until someone manually pulls a report weeks later. By then, a billing problem or a staffing shortage has already happened.

This project builds a system that watches that data continuously and adapts as new data comes in, instead of relying on static, one-time reports. For example, if a department's outstanding (unpaid) billing suddenly starts climbing, or if patient volume in a specific treatment category starts trending up, the system is built to surface that pattern early — using the same kind of predictive techniques (pattern detection, patient segmentation, trend prediction) that get re-run as new data is uploaded, so its picture of the hospital keeps improving rather than going stale.

On top of that warehouse and prediction layer sits a public-facing feature: a symptom checker that suggests a likely condition and finds nearby hospitals for a patient, no login required — a small consumer-facing complement to the internal, staff-facing analytics.

## Key Features

- **Live operations dashboard** — key numbers (revenue, patients, collection rate, average stay) and trend charts on one screen
- **Interactive 3D data cube** — explore hospital data across department, time, and treatment type by rotating and clicking into a 3D visualization, instead of reading a flat table
- **Visual data model explorer** — see how patient, doctor, department, treatment, and billing data connect to each other, as an interactive diagram
- **Automatic pattern detection in billing and treatment data** — surfaces patient segments, likely non-payment risk, and treatments that tend to occur together
- **Dataset upload pipeline** — upload a new data file and kick off the cleaning + re-analysis pipeline that refreshes the predictions above
- **Model performance tracking over time** — see whether the system's predictions are getting more accurate as more data comes in
- **Sortable, searchable, exportable data tables** — browse and export the underlying hospital records
- **AI symptom checker + hospital finder** — a public tool where anyone can describe symptoms, get a likely-condition suggestion, and find nearby hospitals on a map
- **Role-based access** — staff/analyst accounts see the full BI system; patient accounts only see the public chatbot

Screenshots and a recorded demo will be added here once the KNIME, Orange, and Tableau deliverables (below) are finalized.

---

## For Developers

### Tech Stack

**Frontend** — React 18 (Vite), React Router v7, Tailwind CSS v4, Axios, Recharts (charts), ReactFlow (schema diagrams), Three.js (3D OLAP cube), Leaflet + React-Leaflet (hospital map)

**Backend** — FastAPI, SQLAlchemy + psycopg2 (PostgreSQL access), python-jose (JWT), passlib + bcrypt (password hashing), pandas, scikit-learn, google-generativeai (Gemini, for the chatbot), python-dotenv

**Database** — PostgreSQL, star-schema data warehouse

**External DWDM toolchain** — KNIME Analytics Platform (ETL + data mining, triggered from the Upload page), Orange Data Mining (visual analytics, used standalone), Tableau Public (embedded BI dashboard)

### Architecture Overview

The warehouse is a classic star schema: one fact table, `fact_billing` (billing amount, amount paid, outstanding balance, length of stay, visit type, payment mode), surrounded by five dimension tables — `dim_patient`, `dim_doctor`, `dim_department`, `dim_treatment`, and `dim_time`. Four additional tables hold mining output: `mining_decision_tree`, `mining_clusters`, `mining_associations`, and `model_log` (a history of each mining run's accuracy/quality metrics).

Data flow:

```
CSV upload  →  KNIME (ETL + K-Means / Decision Tree / Association Rules)
                    │
                    ▼
             PostgreSQL warehouse (fact_billing + mining_* tables)
                    │
                    ▼
             FastAPI backend (27 endpoints across 9 routers:
             auth, dashboard, schema_info, tables, mining,
             monitoring, olap, chatbot, upload)
                    │
                    ▼
             React frontend (dashboard, 3D OLAP cube, schema
             diagrams, data tables, mining results, monitoring,
             upload, public chatbot)
```

Orange Data Mining and Tableau Public sit outside this request/response loop: Orange is used standalone against KNIME's output to produce visual diagrams (credited on the Tools page), and Tableau Public hosts a dashboard built from the CSVs in `exports/` that gets embedded into the frontend via an iframe URL.

### Setup Instructions

**Prerequisites:** PostgreSQL running locally, Python 3.11+, Node.js 18+.

**1. Clone the repo**
```bash
git clone https://github.com/manibaalakrishnans1171sse-dev/DWDM_Capstone.git
cd DWDM_Capstone
```

**2. Set up the database**
```bash
createdb adaptive_bi
psql -U postgres adaptive_bi < database/schema.sql
```
Populate it with data — either generate synthetic data and load it directly:
```bash
cd database
python generate_data.py          # writes CSVs into database/data/
# edit load_data.sql with your local file paths, then:
psql -U postgres adaptive_bi < load_data.sql
```
or load it through KNIME (see "Open / Next Steps" below). To seed the mining-results tables with sample output (useful before a real KNIME run exists):
```bash
python database/seed_mining_data.py
```

**3. Configure environment variables**

Copy each example file and fill in real values:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env` needs real values for:
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (your local Postgres password) |
| `JWT_SECRET` | Secret used to sign login tokens — generate a random string |
| `GEMINI_API_KEY` | Powers the AI symptom checker |
| `KNIME_EXECUTABLE`, `KNIME_WORKSPACE`, `KNIME_INPUT_FOLDER`, `KNIME_OUTPUT_FOLDER` | Only needed once KNIME is installed — see status section below |

`frontend/.env` needs:
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend URL, default `http://localhost:8000` |
| `VITE_TABLEAU_EMBED_URL` | Tableau Public embed URL — leave blank to show a placeholder |

**4. Run the backend**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
On startup it creates the `users` and `upload_history` tables if they don't exist yet — the rest of the schema is expected to already be in place from step 2.

**5. Run the frontend**
```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:8000
- API docs (Swagger): http://localhost:8000/docs

First run: register an account at `/register`, then log in.

### Current Status

**Completed**
- Auth (register, login, forgot-password, JWT, role-based routes)
- BI dashboard — KPI cards + charts, Tableau embed slot
- 3D OLAP cube (department / time / treatment-category axes, click-to-drill)
- Star + snowflake schema visualization (ReactFlow)
- Data tables — paginated, searchable, sortable, CSV export
- Mining results pages — decision tree, clustering, association rules
- Monitoring page — model run history and latest metrics
- Dataset upload page — CSV upload with validation and a KNIME batch-run trigger
- MediFind chatbot — AI symptom checker + hospital finder map (public, no login)
- Admin patient account management page

**Open / Next Steps**
- Install KNIME locally and build the actual ETL + mining workflow (`schema.sql` and `knime_runner.py` define the required table/column contract; until then, `/upload` fails gracefully with a clear error instead of running)
- Build the three Orange Data Mining workflows (decision tree, clustering, association rules) and capture their visuals
- Publish the Tableau Public dashboard from `exports/` and set `VITE_TABLEAU_EMBED_URL`
- Add a tabbed screenshot viewer to the Tools page for the KNIME/Orange workflow captures
- Add tool-attribution banners to the Mining and Monitoring pages once the above are wired in

### Project Structure

```
adaptive-bi/
├── backend/              FastAPI app
│   ├── main.py             App entrypoint, router registration
│   ├── core/                config.py, database.py, security.py
│   ├── models/               SQLAlchemy user model
│   ├── ml/                    knime_runner.py (batch ETL trigger), local_predictor.py
│   │                          + train_local_model.py (symptom checker)
│   └── routers/                auth, dashboard, schema_info, tables, mining,
│                                monitoring, olap, chatbot, upload
├── frontend/              React app (Vite)
│   └── src/
│       ├── pages/            Dashboard, OlapCubePage, SchemaPage, TablesPage,
│       │                      ToolsPage, MiningPage, MonitoringPage, UploadPage,
│       │                      AdminPatientsPage, Login, Register, ForgotPassword
│       ├── components/        Navbar, Sidebar, KPICard, StarSchemaGraph,
│       │                      SnowflakeSchemaGraph, OlapCube3D, DataTable, ...
│       ├── chatbot/            ChatbotPage (public) + symptom form, hospital map
│       └── api/                Axios client + one module per backend router
├── database/              schema.sql, generate_data.py, seed_mining_data.py,
│                          export_for_tableau.py, load_data.sql, data/ (CSVs)
└── exports/               CSVs generated for the Tableau Public dashboard
```
