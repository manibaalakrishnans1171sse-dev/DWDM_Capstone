"""
SQLAlchemy ORM model for the `users` table (auth only — everything else in the
warehouse is queried with raw SQL via core.database.run_query).
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from core.database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="analyst")
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime(timezone=False), nullable=True)
