"""
Phase 1 — Authentication endpoints: register, login, forgot-password, me.
"""
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_roles,
)

router = APIRouter(prefix="/auth", tags=["auth"])

ALLOWED_ROLES = {"analyst", "admin", "patient"}


# ---------- Schemas ----------

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str
    role: str = "analyst"

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, v):
        if not v or not v.strip():
            raise ValueError("full_name is required")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_min_len(cls, v):
        if len(v) < 6:
            raise ValueError("password must be at least 6 characters")
        return v

    @field_validator("role")
    @classmethod
    def role_allowed(cls, v):
        if v not in ALLOWED_ROLES:
            raise ValueError(f"role must be one of {sorted(ALLOWED_ROLES)}")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class AuthResponse(BaseModel):
    user_id: int
    email: str
    full_name: str
    role: str
    token: str


class MeResponse(BaseModel):
    user_id: int
    email: str
    full_name: str
    role: str
    created_at: datetime | None = None


class AdminPatientRegisterRequest(BaseModel):
    """Admin-only: create a patient (chatbot-only) login. No role field —
    the role is always forced to 'patient' server-side, never taken from
    the caller, so this endpoint can't be used to mint analyst/admin users."""
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, v):
        if not v or not v.strip():
            raise ValueError("full_name is required")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_min_len(cls, v):
        if len(v) < 6:
            raise ValueError("password must be at least 6 characters")
        return v


class PatientSummary(BaseModel):
    user_id: int
    email: str
    full_name: str
    created_at: datetime | None = None


# ---------- Routes ----------

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    try:
        if payload.password != payload.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")

        existing = db.execute(
            text("SELECT user_id FROM users WHERE email = :email"),
            {"email": payload.email},
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists")

        password_hash = hash_password(payload.password)
        row = db.execute(
            text("""
                INSERT INTO users (full_name, email, password_hash, role)
                VALUES (:full_name, :email, :password_hash, :role)
                RETURNING user_id, email, full_name, role
            """),
            {
                "full_name": payload.full_name,
                "email": payload.email,
                "password_hash": password_hash,
                "role": payload.role,
            },
        ).first()
        db.commit()

        token = create_access_token({"sub": str(row.user_id), "email": row.email, "role": row.role})
        return AuthResponse(
            user_id=row.user_id, email=row.email, full_name=row.full_name, role=row.role, token=token
        )
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {exc}")


@router.post("/register-patient", response_model=PatientSummary, status_code=status.HTTP_201_CREATED)
def register_patient(
    payload: AdminPatientRegisterRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_roles("admin")),
):
    """Admin-only: create a patient (chatbot-only) login on a patient's
    behalf. Gated by require_roles("admin") at the API level, so an analyst
    account cannot call this even by hitting the endpoint directly."""
    try:
        if payload.password != payload.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")

        existing = db.execute(
            text("SELECT user_id FROM users WHERE email = :email"),
            {"email": payload.email},
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists")

        password_hash = hash_password(payload.password)
        row = db.execute(
            text("""
                INSERT INTO users (full_name, email, password_hash, role)
                VALUES (:full_name, :email, :password_hash, 'patient')
                RETURNING user_id, email, full_name, created_at
            """),
            {
                "full_name": payload.full_name,
                "email": payload.email,
                "password_hash": password_hash,
            },
        ).first()
        db.commit()

        return PatientSummary(
            user_id=row.user_id, email=row.email, full_name=row.full_name, created_at=row.created_at
        )
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Patient registration failed: {exc}")


@router.get("/patients", response_model=list[PatientSummary])
def list_patients(db: Session = Depends(get_db), _admin: dict = Depends(require_roles("admin"))):
    """Admin-only: list patient logins created so far."""
    rows = db.execute(
        text("""
            SELECT user_id, email, full_name, created_at
            FROM users WHERE role = 'patient'
            ORDER BY created_at DESC
        """),
    ).all()
    return [
        PatientSummary(user_id=r.user_id, email=r.email, full_name=r.full_name, created_at=r.created_at)
        for r in rows
    ]


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        row = db.execute(
            text("""
                SELECT user_id, email, full_name, role, password_hash
                FROM users WHERE email = :email
            """),
            {"email": payload.email},
        ).first()

        if not row or not verify_password(payload.password, row.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_access_token({"sub": str(row.user_id), "email": row.email, "role": row.role})
        return AuthResponse(
            user_id=row.user_id, email=row.email, full_name=row.full_name, role=row.role, token=token
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Login failed: {exc}")


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    try:
        row = db.execute(
            text("SELECT user_id FROM users WHERE email = :email"),
            {"email": payload.email},
        ).first()

        if row:
            reset_token = str(uuid.uuid4())
            expiry = datetime.utcnow() + timedelta(hours=1)
            db.execute(
                text("""
                    UPDATE users SET reset_token = :token, reset_token_expiry = :expiry
                    WHERE user_id = :user_id
                """),
                {"token": reset_token, "expiry": expiry, "user_id": row.user_id},
            )
            db.commit()
            # Academic demo: no real email service — print the reset link/token to console.
            print(f"[PASSWORD RESET] email={payload.email} token={reset_token} expires={expiry.isoformat()}")

        return {"message": "If this email exists, a reset link has been sent"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Request failed: {exc}")


@router.get("/me", response_model=MeResponse)
def me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        row = db.execute(
            text("""
                SELECT user_id, email, full_name, role, created_at
                FROM users WHERE user_id = :user_id
            """),
            {"user_id": int(current_user["sub"])},
        ).first()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return MeResponse(
            user_id=row.user_id,
            email=row.email,
            full_name=row.full_name,
            role=row.role,
            created_at=row.created_at,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not load user: {exc}")
