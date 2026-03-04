"""
Symptom preprocessing utilities.
"""
from typing import List

def normalize_symptoms(symptoms: List[str]) -> List[str]:
    """Standardize symptom names: lowercase, strip."""
    return [s.strip().lower() for s in symptoms if s]