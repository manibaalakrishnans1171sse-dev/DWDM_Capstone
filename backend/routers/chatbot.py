import google.generativeai as genai
import json
import re
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Optional
from core.config import settings
from ml.local_predictor import local_predictor

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

# Configure Gemini
try:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-flash-latest")  # gemini-1.5-flash was retired
    GEMINI_AVAILABLE = bool(settings.GEMINI_API_KEY)
except Exception:
    GEMINI_AVAILABLE = False

class SymptomRequest(BaseModel):
    symptoms: str
    age: Optional[int] = None
    gender: Optional[str] = None

def _call_gemini(symptoms: str, age, gender) -> dict:
    """Try Gemini API. Raises exception if it fails."""
    prompt = f"""You are a medical symptom analyzer. Analyze these symptoms and respond ONLY with a valid JSON object, no markdown, no extra text.

Patient: Symptoms: {symptoms}, Age: {age or 'Not provided'}, Gender: {gender or 'Not provided'}

Respond with ONLY this JSON:
{{
  "disease": "condition name",
  "confidence": 0.85,
  "severity": "Mild",
  "description": "2-3 sentence explanation",
  "precautions": ["precaution 1", "precaution 2", "precaution 3"],
  "specialist": "doctor type",
  "emergency": false,
  "disclaimer": "This is AI-based analysis for informational purposes only. Please consult a qualified doctor.",
  "source": "gemini"
}}

Rules: severity = Mild/Moderate/Severe only. confidence = 0.0 to 1.0. emergency = true only for life-threatening symptoms. precautions = exactly 3 items."""

    response = gemini_model.generate_content(prompt)
    text = response.text.strip()
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text).strip()
    result = json.loads(text)

    # Validate required fields
    required = ["disease", "confidence", "severity", "description", "precautions", "specialist", "emergency"]
    for field in required:
        if field not in result:
            raise ValueError(f"Missing field: {field}")

    result["source"] = "gemini"
    return result

@router.post("/predict")
async def predict_disease(request: SymptomRequest, response: Response):
    """
    Fallback chain:
    1. Try Gemini API
    2. If Gemini fails → use local trained ML model
    3. If local model fails → return safe generic response
    """

    # Validate input
    if not request.symptoms or len(request.symptoms.strip()) < 3:
        raise HTTPException(status_code=400, detail="Please describe your symptoms in more detail.")

    result = None

    # ATTEMPT 1: Gemini API
    if GEMINI_AVAILABLE:
        try:
            result = _call_gemini(request.symptoms, request.age, request.gender)
            print(f"✅ Gemini prediction: {result['disease']}")
        except Exception as e:
            print(f"⚠️  Gemini failed ({type(e).__name__}: {e}) — falling back to local model")

    # ATTEMPT 2: Local trained ML model
    if result is None and local_predictor.is_loaded:
        try:
            result = local_predictor.predict(request.symptoms, request.age, request.gender)
            print(f"✅ Local model prediction: {result['disease']}")
        except Exception as e:
            print(f"⚠️  Local model failed: {e} — using safe fallback")

    # ATTEMPT 3: Safe fallback — never show error to user
    if result is None:
        result = local_predictor._safe_fallback()

    # The frontend reads this header to trigger the emergency alert banner,
    # regardless of which of the three systems above produced the result.
    if result.get("emergency"):
        response.headers["X-Emergency"] = "true"

    return result

@router.get("/model-status")
async def model_status():
    """Check status of prediction systems — useful for debugging."""
    return {
        "gemini_configured": GEMINI_AVAILABLE,
        "local_model_loaded": local_predictor.is_loaded,
        "active_system": "gemini" if GEMINI_AVAILABLE else ("local_model" if local_predictor.is_loaded else "safe_fallback")
    }
