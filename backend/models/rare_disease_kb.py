"""
models/rare_disease_kb.py
--------------------------
Rule-based rare disease knowledge base predictor.
Scores diseases based on symptom overlap with curated clinical criteria.
Returns results in the same format as StructuredPredictor for drop-in compatibility.
"""
import json
import os
import numpy as np
from typing import List, Tuple, Dict, Any, Optional

# Path to the knowledge base JSON
_KB_PATH = os.path.join(os.path.dirname(__file__), '..', 'knowledge_graph', 'rare_diseases.json')


def _load_kb() -> List[Dict]:
    with open(_KB_PATH, 'r') as f:
        return json.load(f)


# Symptom alias map — plain English → internal symptom keys used in JSON
SYMPTOM_ALIASES = {
    # general
    "fatigue": "fatigue", "tiredness": "fatigue", "weakness": "fatigue",
    "weight loss": "weight loss", "fever": "fever", "night sweats": "night sweats",
    "anemia": "anemia", "pallor": "pallor", "jaundice": "jaundice",

    # pain
    "joint pain": "joint pain", "bone pain": "bone pain", "back pain": "back pain",
    "abdominal pain": "abdominal pain", "stomach pain": "abdominal pain",
    "chest pain": "chest pain", "muscle pain": "muscle pain",
    "burning pain in hands and feet": "burning pain in hands and feet",
    "neuropathy": "neuropathy", "headache": "headache",

    # neurological
    "seizures": "seizures", "tremor": "tremor", "ataxia": "ataxia",
    "cognitive decline": "cognitive decline", "memory loss": "cognitive decline",
    "confusion": "cognitive decline", "chorea": "chorea",
    "muscle weakness": "muscle weakness", "fasciculations": "fasciculations",
    "spasticity": "spasticity", "dysarthria": "dysarthria",
    "dysphagia": "dysphagia", "diplopia": "diplopia",
    "ptosis": "ptosis", "psychiatric symptoms": "psychiatric symptoms",
    "depression": "depression", "anxiety": "anxiety",
    "intellectual disability": "intellectual disability",
    "developmental regression": "developmental regression",
    "loss of speech": "loss of speech",
    "loss of purposeful hand use": "loss of purposeful hand use",
    "repetitive hand movements": "repetitive hand movements",
    "stroke-like episodes": "stroke-like episodes",

    # vision/hearing
    "vision problems": "vision problems", "blurred vision": "vision problems",
    "vision loss": "vision loss", "hearing loss": "hearing loss",
    "corneal opacity": "corneal opacity", "dry eyes": "dry eyes",

    # skin
    "skin rash": "skin rash", "rash": "skin rash",
    "butterfly rash": "butterfly rash", "skin lesions": "skin lesions",
    "angiokeratoma": "angiokeratoma", "cafe au lait spots": "cafe au lait spots",
    "neurofibromas": "neurofibromas", "skin blistering": "skin blistering",
    "generalized scaling": "generalized scaling", "eczema": "eczema",
    "telangiectasias": "telangiectasias", "port wine stain": "port wine stain",
    "skin fragility": "skin fragility", "hypopigmentation": "hypopigmentation",
    "photosensitivity": "photosensitivity", "easy bruising": "easy bruising",
    "extreme sun sensitivity": "extreme sun sensitivity",

    # GI / liver
    "hepatomegaly": "hepatomegaly", "enlarged liver": "hepatomegaly",
    "splenomegaly": "splenomegaly", "enlarged spleen": "splenomegaly",
    "liver disease": "liver disease", "nausea": "nausea", "vomiting": "vomiting",
    "diarrhea": "diarrhea", "constipation": "constipation",
    "dark urine": "dark urine", "blood in stool": "gastrointestinal bleeding",
    "gastrointestinal bleeding": "gastrointestinal bleeding",
    "malabsorption": "malabsorption",

    # respiratory
    "dyspnea": "dyspnea", "shortness of breath": "dyspnea",
    "breathlessness": "dyspnea", "chronic cough": "chronic cough",
    "cough": "chronic cough", "wheezing": "wheezing",
    "recurrent lung infections": "recurrent lung infections",
    "respiratory failure": "respiratory failure",

    # cardiovascular
    "cardiomyopathy": "cardiomyopathy", "heart disease": "heart disease",
    "heart defects": "heart defects", "aortic aneurysm": "aortic aneurysm",
    "hypertension": "hypertension", "edema": "edema", "swollen legs": "edema",

    # musculoskeletal
    "joint hypermobility": "joint hypermobility",
    "joint stiffness": "joint stiffness",
    "scoliosis": "scoliosis", "short stature": "short stature",
    "tall stature": "tall stature", "fractures": "recurrent fractures",
    "recurrent fractures": "recurrent fractures",
    "muscle stiffness": "muscle stiffness", "muscle spasms": "muscle spasms",
    "muscle atrophy": "muscle atrophy",
    "progressive leg weakness": "progressive leg weakness",

    # bleeding / blood
    "prolonged bleeding": "prolonged bleeding",
    "joint bleeding": "joint bleeding", "hemarthrosis": "joint bleeding",
    "thrombocytopenia": "thrombocytopenia",
    "thrombosis": "thrombosis", "anaphylaxis": "anaphylaxis",
    "recurrent nosebleeds": "recurrent nosebleeds",

    # kidney
    "kidney failure": "kidney failure", "kidney disease": "kidney disease",
    "kidney stones": "kidney stones",

    # other
    "hypotonia": "hypotonia", "macroglossia": "macroglossia",
    "lymphadenopathy": "swollen lymph nodes",
    "swollen lymph nodes": "swollen lymph nodes",
    "hair loss": "alopecia", "alopecia": "alopecia",
    "diabetes": "diabetes", "obesity": "obesity",
    "hyperphagia": "hyperphagia", "coarse facial features": "coarse facial features",
    "corneal clouding": "corneal clouding", "dry mouth": "dry mouth",
    "flushing": "flushing", "pruritus": "pruritus", "itching": "pruritus",
    "premature aging": "premature aging", "kayser-fleischer rings": "kayser-fleischer rings",
    "ochronosis": "ochronosis", "hyperpigmentation": "hyperpigmentation",
    "salt craving": "salt craving", "hypotension": "hypotension",
    "lactic acidosis": "lactic acidosis", "exercise intolerance": "exercise intolerance",
    "recurrent angioedema": "recurrent angioedema",
    "laryngeal edema": "laryngeal edema", "facial swelling": "facial swelling",
    "hemolytic anemia": "hemolytic anemia",
    "recurrent bacterial infections": "recurrent bacterial infections",
    "recurrent fungal infections": "recurrent fungal infections",
    "granulomas": "granulomas", "ascending muscle weakness": "ascending muscle weakness",
    "loss of reflexes": "loss of reflexes",
    "worsening with activity": "worsening with activity",
    "blue sclerae": "blue sclerae", "elfin facies": "elfin facies",
    "webbed neck": "webbed neck", "multiple hamartomas": "multiple hamartomas",
    "macrocephaly": "macrocephaly", "hemangioblastomas": "hemangioblastomas",
    "retinal angiomas": "retinal angiomas", "pheochromocytoma": "pheochromocytoma",
    "hyperparathyroidism": "hyperparathyroidism",
    "pituitary tumors": "pituitary tumors",
    "coloboma": "coloboma", "choanal atresia": "choanal atresia",
    "skin cancer": "skin cancer",
    "small platelets": "small platelets",
}


class RareDiseasePredictor:
    """
    Knowledge-base rule scorer for rare diseases.
    Compatible interface with StructuredPredictor.
    """

    def __init__(self, kb_path: str = None):
        path = kb_path or _KB_PATH
        self.diseases = _load_kb() if kb_path is None else json.load(open(kb_path))
        self.disease_names = [d['name'] for d in self.diseases]

    def _normalize(self, symptoms: List[str]) -> List[str]:
        """Map raw symptom strings to internal keys."""
        normalized = []
        for s in symptoms:
            key = SYMPTOM_ALIASES.get(s.lower().strip())
            if key:
                normalized.append(key)
            else:
                normalized.append(s.lower().strip())
        return normalized

    def _score_disease(self, disease: Dict, symptoms: List[str]) -> float:
        """
        Score a disease against a symptom list.
        - Each matched symptom contributes equally.
        - Required symptoms give a big bonus if ALL present, penalty if ANY missing.
        - Score is normalized 0-1.
        """
        disease_symptoms = [s.lower() for s in disease.get('symptoms', [])]
        required = [s.lower() for s in disease.get('required', [])]

        if not disease_symptoms:
            return 0.0

        # Count matches
        matched = sum(1 for s in symptoms if s in disease_symptoms)

        if matched == 0:
            return 0.0

        # Base score: overlap / total disease symptoms (recall-like)
        base = matched / len(disease_symptoms)

        # Bonus: what fraction of patient symptoms match this disease
        precision = matched / max(len(symptoms), 1)

        # Required symptom check
        required_matched = sum(1 for r in required if r in symptoms)
        if required and required_matched == 0:
            return base * 0.1  # huge penalty — no required symptoms
        elif required and required_matched < len(required):
            required_factor = 0.5 + 0.5 * (required_matched / len(required))
        else:
            required_factor = 1.5  # bonus for all required matched

        score = (base * 0.5 + precision * 0.5) * required_factor
        return min(score, 1.0)

    def predict_proba_full(self, symptoms: List[str]) -> np.ndarray:
        """Return probability array across all diseases."""
        norm = self._normalize(symptoms)
        scores = np.array([self._score_disease(d, norm) for d in self.diseases])

        if scores.sum() == 0:
            return scores

        # Softmax-like normalization so scores sum to 1
        scores = scores / scores.sum()
        return scores

    def predict_top5(self, symptoms: List[str], demographics: Optional[Dict] = None) -> List[Tuple[str, float]]:
        proba = self.predict_proba_full(symptoms)
        top5_idx = np.argsort(proba)[-5:][::-1]
        return [(self.disease_names[i], float(proba[i])) for i in top5_idx]

    def predict_proba(self, symptoms: List[str], demographics: Optional[Dict] = None) -> np.ndarray:
        return self.predict_proba_full(symptoms)

    def explain(self, symptoms: List[str], demographics: Optional[Dict] = None):
        """Return top symptom importances and a dummy shap array."""
        norm = self._normalize(symptoms)
        proba = self.predict_proba_full(symptoms)
        top_disease_idx = int(np.argmax(proba))
        top_disease = self.diseases[top_disease_idx]
        disease_symptoms = [s.lower() for s in top_disease.get('symptoms', [])]

        # Importance: 1.0 if matched, 0.1 if not
        importances = [(s, 1.0 if s in disease_symptoms else 0.1) for s in norm]
        importances.sort(key=lambda x: x[1], reverse=True)

        shap_array = np.array([imp for _, imp in importances[:10]])
        return importances[:10], shap_array

    def get_disease_info(self, name: str) -> Optional[Dict]:
        for d in self.diseases:
            if d['name'] == name:
                return d
        return None

    @property
    def le(self):
        """Compatibility shim — mimics LabelEncoder."""
        class _FakeLE:
            def __init__(self, names):
                self.classes_ = np.array(names)
            def inverse_transform(self, idxs):
                return np.array([self.classes_[i] for i in idxs])
        return _FakeLE(self.disease_names)

    @property
    def feature_names(self) -> List[str]:
        """All unique symptoms across all diseases."""
        all_symptoms = set()
        for d in self.diseases:
            all_symptoms.update(s.lower() for s in d.get('symptoms', []))
        return sorted(all_symptoms)
