"""
SQLAlchemy engine/session setup + a raw psycopg2-style connection helper for
ad-hoc SQL (used heavily by the read-only reporting routers).
"""
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

from core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a SQLAlchemy session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_conn():
    """Context manager yielding a raw DBAPI connection for dynamic/whitelisted SQL."""
    conn = engine.connect()
    try:
        yield conn
    finally:
        conn.close()


def run_query(sql: str, params: dict | None = None):
    """Run a SELECT and return list[dict] rows."""
    with engine.connect() as conn:
        result = conn.execute(text(sql), params or {})
        cols = result.keys()
        return [dict(zip(cols, row)) for row in result.fetchall()]


def run_query_one(sql: str, params: dict | None = None):
    rows = run_query(sql, params)
    return rows[0] if rows else None


def init_db():
    """Create the `users` and `upload_history` tables if they don't already exist.

    The rest of the warehouse schema (dim_*, fact_billing, mining_*, model_log,
    views) is assumed to already exist in the `adaptive_bi` database and is never
    touched here.
    """
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
              user_id SERIAL PRIMARY KEY,
              full_name VARCHAR(100) NOT NULL,
              email VARCHAR(100) UNIQUE NOT NULL,
              password_hash VARCHAR(255) NOT NULL,
              role VARCHAR(20) DEFAULT 'analyst',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              reset_token VARCHAR(255),
              reset_token_expiry TIMESTAMP
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS upload_history (
              upload_id SERIAL PRIMARY KEY,
              filename VARCHAR(255),
              upload_datetime TIMESTAMP DEFAULT NOW(),
              rows_inserted INT,
              dt_accuracy NUMERIC(5,4),
              kmeans_silhouette NUMERIC(5,4),
              rules_found INT,
              status VARCHAR(20)
            )
        """))
