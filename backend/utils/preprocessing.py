 
def normalize_symptoms(symptoms):
    """Standardize symptom names (lowercase, strip)."""
    return [s.strip().lower() for s in symptoms if s]