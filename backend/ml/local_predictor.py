"""
Local ML predictor — used as fallback when Gemini API fails.
Loads trained model on startup, predicts from symptoms text.
"""

import pickle
import os
import numpy as np
from typing import Optional

MODEL_DIR = os.path.join(os.path.dirname(__file__), "trained_models")

class LocalDiseasePredictor:
    def __init__(self):
        self.vectorizer = None
        self.classifier = None
        self.disease_meta = None
        self.is_loaded = False
        self._load_models()

    def _load_models(self):
        try:
            vectorizer_path = os.path.join(MODEL_DIR, "vectorizer.pkl")
            classifier_path = os.path.join(MODEL_DIR, "classifier.pkl")
            meta_path = os.path.join(MODEL_DIR, "disease_meta.pkl")

            if not all(os.path.exists(p) for p in [vectorizer_path, classifier_path, meta_path]):
                print("⚠️  Local model files not found. Run train_local_model.py first.")
                self.is_loaded = False
                return

            with open(vectorizer_path, "rb") as f:
                self.vectorizer = pickle.load(f)

            with open(classifier_path, "rb") as f:
                self.classifier = pickle.load(f)

            with open(meta_path, "rb") as f:
                self.disease_meta = pickle.load(f)

            self.is_loaded = True
            print("✅ Local fallback model loaded successfully")

        except Exception as e:
            print(f"❌ Failed to load local model: {e}")
            self.is_loaded = False

    def predict(self, symptoms: str, age: Optional[int] = None, gender: Optional[str] = None) -> dict:
        if not self.is_loaded:
            return self._safe_fallback()

        try:
            # Vectorize input
            X = self.vectorizer.transform([symptoms.lower()])

            # Get prediction and probabilities
            disease = self.classifier.predict(X)[0]
            probabilities = self.classifier.predict_proba(X)[0]
            classes = self.classifier.classes_

            # Get top 3 predictions for confidence context
            top_indices = np.argsort(probabilities)[-3:][::-1]
            top_disease_idx = top_indices[0]
            confidence = float(probabilities[top_disease_idx])

            # Adjust confidence to realistic range (0.55 - 0.92)
            # Raw RF probabilities can be overconfident
            adjusted_confidence = 0.55 + (confidence * 0.37)
            adjusted_confidence = min(0.92, max(0.55, adjusted_confidence))

            # Get metadata
            meta = self.disease_meta.get(disease, {})
            severity = meta.get('severity', 'Moderate')
            description = meta.get('description', f'{disease} requires medical attention.')
            precautions_raw = meta.get('precautions', 'Consult a doctor|Rest and stay hydrated|Monitor symptoms')
            precautions = [p.strip() for p in precautions_raw.split('|')][:3]
            specialist = meta.get('specialist', 'General Physician')

            # Determine if emergency
            emergency_diseases = [
                'Cardiac Event (Heart Attack)', 'Stroke', 'Meningitis',
                'Sepsis', 'Pulmonary Embolism', 'Kidney Failure',
                'Liver Failure', 'Hypothermia'
            ]
            emergency = disease in emergency_diseases or severity == 'Severe' and confidence > 0.7

            return {
                "disease": disease,
                "confidence": round(adjusted_confidence, 2),
                "severity": severity,
                "description": description,
                "precautions": precautions if len(precautions) == 3 else precautions + ["Consult a doctor"][:3-len(precautions)],
                "specialist": specialist,
                "emergency": bool(emergency),
                "disclaimer": "This analysis was performed by our local AI model. This is for informational purposes only. Please consult a qualified doctor for proper diagnosis.",
                "source": "local_model"
            }

        except Exception as e:
            print(f"Local prediction error: {e}")
            return self._safe_fallback()

    def _safe_fallback(self) -> dict:
        return {
            "disease": "Consult a Doctor",
            "confidence": 0.0,
            "severity": "Moderate",
            "description": "We could not analyze your symptoms at this time. Please consult a qualified medical professional for proper diagnosis.",
            "precautions": [
                "Visit a doctor or clinic as soon as possible",
                "In emergency call 112 (National) or 108 (Ambulance)",
                "Monitor your symptoms and note any changes"
            ],
            "specialist": "General Physician",
            "emergency": False,
            "disclaimer": "Please consult a qualified doctor for proper diagnosis and treatment.",
            "source": "safe_fallback"
        }

# Singleton instance — loaded once on startup
local_predictor = LocalDiseasePredictor()
