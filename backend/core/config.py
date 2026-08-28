"""
Central application configuration, loaded from environment variables (.env).
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/adaptive_bi"
    )
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-env")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    CORS_ORIGINS: list = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]

    # External DWDM toolchain — KNIME does ETL + mining as a batch-mode workflow
    # triggered from the /upload endpoint. These paths only work once KNIME is
    # actually installed and a matching workflow exists at KNIME_WORKSPACE.
    KNIME_EXECUTABLE: str = os.getenv("KNIME_EXECUTABLE", "C:/Program Files/KNIME/knime.exe")
    KNIME_WORKSPACE: str = os.getenv("KNIME_WORKSPACE", "C:/knime-workspace/adaptive-bi-pipeline")
    KNIME_INPUT_FOLDER: str = os.getenv("KNIME_INPUT_FOLDER", "C:/adaptive-bi/knime-input")
    KNIME_OUTPUT_FOLDER: str = os.getenv("KNIME_OUTPUT_FOLDER", "C:/adaptive-bi/knime-output")
    KNIME_TIMEOUT_SECONDS: int = int(os.getenv("KNIME_TIMEOUT_SECONDS", "1800"))


settings = Settings()
