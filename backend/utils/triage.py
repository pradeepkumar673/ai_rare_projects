"""
Risk assessment based on confidence, symptoms, and demographics.
"""
from typing import List, Dict, Any, Tuple, Optional
from knowledge_graph.builder import KnowledgeGraph

def assess_risk(top_confidence: float,
                symptoms: List[str],
                demographics: Dict[str, Any],
                kg: Optional[KnowledgeGraph] = None) -> Tuple[str, str]:
    """
    Determine risk level and urgency.
    Returns (risk_level, urgency).
    """
    # Base risk from confidence
    if top_confidence > 0.8:
        risk = 'High'
        urgency = 'Immediate (within 24h)'
    elif top_confidence > 0.5:
        risk = 'Medium'
        urgency = 'Soon (within 1 week)'
    else:
        risk = 'Low'
        urgency = 'Routine (schedule appointment)'

    # Age-based boost
    age = demographics.get('age')
    if age is not None and age < 5:
        risk = 'High'
        urgency = 'Immediate'

    # Red flag symptoms
    red_flags = {'chest pain', 'shortness of breath', 'seizure', 'unconsciousness'}
    if any(s in red_flags for s in symptoms):
        risk = 'High'
        urgency = 'Emergency'

    # Rare symptom cluster (if KG available)
    if kg:
        rare_symptoms = kg.get_rare_symptoms()
        rare_count = sum(1 for s in symptoms if s in rare_symptoms)
        if rare_count >= 3:
            risk = 'High'
            urgency = 'Immediate (rare cluster)'

    return risk, urgency