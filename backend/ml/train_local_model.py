"""
Run this script once to train and save the local fallback model.
Command: python backend/ml/train_local_model.py
"""

import pandas as pd
import numpy as np
import pickle
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import LabelEncoder

# Load dataset
DATASET_PATH = os.path.join(os.path.dirname(__file__), "disease_dataset.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "trained_models")
os.makedirs(MODEL_DIR, exist_ok=True)

df = pd.read_csv(DATASET_PATH)

print(f"Loaded {len(df)} diseases")
print(f"Diseases: {df['disease'].tolist()}")

# Augment training data
# For each disease, create multiple training samples with partial symptoms
# This makes the model handle cases where user types only some symptoms
augmented_symptoms = []
augmented_diseases = []

for _, row in df.iterrows():
    symptoms_list = [s.strip() for s in row['symptoms'].split(',')]
    disease = row['disease']

    # Add full symptom string
    augmented_symptoms.append(row['symptoms'])
    augmented_diseases.append(disease)

    # Add partial combinations (minimum 3 symptoms)
    if len(symptoms_list) >= 6:
        for _ in range(8):
            n = np.random.randint(3, len(symptoms_list))
            sample = np.random.choice(symptoms_list, n, replace=False)
            augmented_symptoms.append(', '.join(sample))
            augmented_diseases.append(disease)

    # Add variations with natural language
    natural_variants = [
        f"I have {', '.join(symptoms_list[:4])}",
        f"suffering from {', '.join(symptoms_list[:3])}",
        f"experiencing {', '.join(symptoms_list[:5])}",
        f"feeling {symptoms_list[0]} and {symptoms_list[1]}",
    ]
    for variant in natural_variants:
        augmented_symptoms.append(variant)
        augmented_diseases.append(disease)

print(f"Augmented to {len(augmented_symptoms)} training samples")

# Vectorize
vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),
    max_features=5000,
    stop_words='english'
)
X = vectorizer.fit_transform(augmented_symptoms)
y = augmented_diseases

# Train
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

clf = RandomForestClassifier(
    n_estimators=200,
    max_depth=None,
    random_state=42,
    n_jobs=-1
)
clf.fit(X_train, y_train)

# Evaluate
y_pred = clf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model accuracy: {accuracy:.2%}")

# Save everything
with open(os.path.join(MODEL_DIR, "vectorizer.pkl"), "wb") as f:
    pickle.dump(vectorizer, f)

with open(os.path.join(MODEL_DIR, "classifier.pkl"), "wb") as f:
    pickle.dump(clf, f)

# Save disease metadata for lookup
disease_meta = df.set_index('disease').to_dict('index')
with open(os.path.join(MODEL_DIR, "disease_meta.pkl"), "wb") as f:
    pickle.dump(disease_meta, f)

print("✅ Models saved successfully to backend/ml/trained_models/")
print("Files saved:")
print("  - vectorizer.pkl")
print("  - classifier.pkl")
print("  - disease_meta.pkl")
