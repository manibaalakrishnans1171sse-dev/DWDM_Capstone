"""
Adaptive BI — FastAPI entrypoint.
Run with: uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import init_db
from routers import auth, dashboard, schema_info, tables, mining, monitoring, olap, chatbot, upload

app = FastAPI(
    title="Adaptive BI — Hospital Data Warehouse & Mining API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {"status": "ok", "service": "adaptive-bi-api"}


@app.get("/health")
def health():
    try:
        from core.database import run_query_one
        run_query_one("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}


app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(schema_info.router)
app.include_router(tables.router)
app.include_router(mining.router)
app.include_router(monitoring.router)
app.include_router(olap.router)
app.include_router(chatbot.router)
app.include_router(upload.router)
