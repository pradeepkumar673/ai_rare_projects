 
def assess_risk(top_confidence, symptoms, demographics):
    """
    Simple rule‑based risk assessment.
    Return (risk_level, urgency).
    """
    if top_confidence > 0.8:
        risk = 'High'
        urgency = 'Immediate (within 24h)'
    elif top_confidence > 0.5:
        risk = 'Medium'
        urgency = 'Soon (within 1 week)'
    else:
        risk = 'Low'
        urgency = 'Routine (schedule appointment)'

    # Additional rules could be added based on specific symptoms
    if 'chest pain' in symptoms or 'shortness of breath' in symptoms:
        risk = 'High'
        urgency = 'Emergency'

    return risk, urgency