"""
utils/preprocessing.py
Maps plain English symptoms to the Kaggle dataset feature names.
"""
from typing import List

ALIASES = {
    "joint pain": "joint_pain",
    "stomach pain": "stomach_pain",
    "abdominal pain": "stomach_pain",
    "acidity": "acidity",
    "vomiting": "vomiting",
    "throwing up": "vomiting",
    "fatigue": "fatigue",
    "tiredness": "fatigue",
    "weight gain": "weight_gain",
    "anxiety": "anxiety",
    "cold hands": "cold_hands_and_feets",
    "mood swings": "mood_swings",
    "weight loss": "weight_loss",
    "restlessness": "restlessness",
    "lethargy": "lethargy",
    "patches in throat": "patches_in_throat",
    "irregular sugar level": "irregular_sugar_level",
    "cough": "cough",
    "high fever": "high_fever",
    "fever": "high_fever",
    "sunken eyes": "sunken_eyes",
    "breathlessness": "breathlessness",
    "shortness of breath": "breathlessness",
    "difficulty breathing": "breathlessness",
    "sweating": "sweating",
    "dehydration": "dehydration",
    "indigestion": "indigestion",
    "headache": "headache",
    "head pain": "headache",
    "yellowish skin": "yellowish_skin",
    "jaundice": "yellowish_skin",
    "dark urine": "dark_urine",
    "nausea": "nausea",
    "loss of appetite": "loss_of_appetite",
    "no appetite": "loss_of_appetite",
    "pain behind the eyes": "pain_behind_the_eyes",
    "back pain": "back_pain",
    "constipation": "constipation",
    "muscle pain": "muscle_pain",
    "muscle ache": "muscle_pain",
    "myalgia": "muscle_pain",
    "dizziness": "dizziness",
    "dizzy": "dizziness",
    "knee pain": "knee_pain",
    "hip joint pain": "hip_joint_pain",
    "swelling joints": "swelling_joints",
    "movement stiffness": "movement_stiffness",
    "stiff joints": "movement_stiffness",
    "spinning movements": "spinning_movements",
    "loss of balance": "loss_of_balance",
    "unsteadiness": "unsteadiness",
    "weakness of one body side": "weakness_of_one_body_side",
    "loss of smell": "loss_of_smell",
    "anosmia": "loss_of_smell",
    "bladder discomfort": "bladder_discomfort",
    "foul smell of urine": "foul_smell_of_urine",
    "continuous feel of urine": "continuous_feel_of_urine",
    "frequent urination": "continuous_feel_of_urine",
    "passage of gases": "passage_of_gases",
    "bloating": "passage_of_gases",
    "internal itching": "internal_itching",
    "itching": "itching",
    "skin rash": "skin_rash",
    "rash": "skin_rash",
    "nodal skin eruptions": "nodal_skin_eruptions",
    "continuous sneezing": "continuous_sneezing",
    "sneezing": "continuous_sneezing",
    "shivering": "shivering",
    "chills": "chills",
    "joint pain": "joint_pain",
    "stomach pain": "stomach_pain",
    "muscle wasting": "muscle_wasting",
    "pus filled pimples": "pus_filled_pimples",
    "blackheads": "blackheads",
    "scurring": "scurring",
    "skin peeling": "skin_peeling",
    "silver like dusting": "silver_like_dusting",
    "small dents in nails": "small_dents_in_nails",
    "inflammatory nails": "inflammatory_nails",
    "blister": "blister",
    "red sore around nose": "red_sore_around_nose",
    "yellow crust ooze": "yellow_crust_ooze",
    "chest pain": "chest_pain",
    "weakness in limbs": "weakness_in_limbs",
    "fast heart rate": "fast_heart_rate",
    "palpitations": "fast_heart_rate",
    "pain during bowel movements": "pain_during_bowel_movements",
    "pain in anal region": "pain_in_anal_region",
    "bloody stool": "bloody_stool",
    "irritation in anus": "irritation_in_anus",
    "neck pain": "neck_pain",
    "diarrhoea": "diarrhoea",
    "diarrhea": "diarrhoea",
    "loose stools": "diarrhoea",
    "mild fever": "mild_fever",
    "swelled lymph nodes": "swelled_lymph_nodes",
    "malaise": "malaise",
    "blurred vision": "blurred_and_distorted_vision",
    "distorted vision": "blurred_and_distorted_vision",
    "phlegm": "phlegm",
    "throat irritation": "throat_irritation",
    "sore throat": "throat_irritation",
    "redness of eyes": "redness_of_eyes",
    "red eyes": "redness_of_eyes",
    "watering from eyes": "watering_from_eyes",
    "runny eyes": "watering_from_eyes",
    "increased appetite": "increased_appetite",
    "polyuria": "polyuria",
    "excessive urination": "polyuria",
    "rusty sputum": "rusty_sputum",
    "lack of concentration": "lack_of_concentration",
    "visual disturbances": "visual_disturbances",
    "swollen legs": "swollen_legs",
    "swollen blood vessels": "swollen_blood_vessels",
    "puffy face and eyes": "puffy_face_and_eyes",
    "enlarged thyroid": "enlarged_thyroid",
    "brittle nails": "brittle_nails",
    "swollen extremeties": "swollen_extremeties",
    "excessive hunger": "excessive_hunger",
    "extra marital contacts": "extra_marital_contacts",
    "drying and tingling lips": "drying_and_tingling_lips",
    "slurred speech": "slurred_speech",
    "knee pain": "knee_pain",
    "prominent veins on calf": "prominent_veins_on_calf",
    "acute liver failure": "acute_liver_failure",
    "fluid overload": "fluid_overload",
    "swelling of stomach": "swelling_of_stomach",
    "swollen pancreas": "swollen_pancreas", 
    "persistent cough": "cough",
    "yellow eyes": "yellowing_of_eyes",
    "yellowing of eyes": "yellowing_of_eyes",
    "obesity": "obesity",
    "overweight": "obesity",
    "depression": "depression",
    "irritability": "irritability",
    "muscle weakness": "muscle_weakness",
    "stiff neck": "stiff_neck",
    "swollen joints": "swollen_joints",
    "excessive thirst": "excessive_thirst",
    "thirst": "excessive_thirst",
}

def normalize_symptoms(symptoms: List[str], feature_names=None) -> List[str]:
    matched = []
    for raw in symptoms:
        sym = raw.lower().strip().replace(' ', '_')
        result = None

        # 1. Direct match with underscores
        if result is None and sym in (feature_names or []):
            result = sym

        # 2. Alias lookup
        raw_lower = raw.lower().strip()
        if result is None and raw_lower in ALIASES:
            result = ALIASES[raw_lower]

        # 3. Substring match against feature names
        if result is None and feature_names:
            for feat in feature_names:
                if sym in feat or feat in sym:
                    result = feat
                    break

        if result and result not in matched:
            matched.append(result)

    return matched