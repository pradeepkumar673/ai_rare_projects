 
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from werkzeug.utils import secure_filename
import os
from datetime import datetime
import io

from models.structured_model import StructuredPredictor
from models.image_model import ImagePredictor
from models.fusion import MultimodalFusion
from knowledge_graph.builder import KnowledgeGraph
from utils.preprocessing import normalize_symptoms
from utils.explainability import generate_shap_plot
from utils.report_generator import generate_pdf_report
from utils.triage import assess_risk

diagnosis_bp = Blueprint('diagnosis', __name__)

# Load models once (at startup)
structured_predictor = StructuredPredictor(
    rf_path=current_app.config['STRUCTURED_MODEL_PATH'],
    xgb_path=current_app.config['XGB_MODEL_PATH'],
    encoder_path=current_app.config['LABEL_ENCODER_PATH'],
    feature_names_path=current_app.config['FEATURE_NAMES_PATH']
)
image_predictor = ImagePredictor(current_app.config['IMAGE_MODEL_PATH'])
fusion = MultimodalFusion()
kg = KnowledgeGraph()  # or load from json

@diagnosis_bp.route('/predict', methods=['POST'])
@jwt_required()
def predict():
    user_id = get_jwt_identity()
    data = request.form  # since we may have image file
    symptoms = data.getlist('symptoms[]')  # expects multiple values
    demographics = {
        'age': data.get('age'),
        'gender': data.get('gender'),
        'ethnicity': data.get('ethnicity'),
        'region': data.get('region')
    }
    image_file = request.files.get('image')

    # Normalize symptom names (e.g., to lowercase, strip)
    symptoms = [s.strip().lower() for s in symptoms if s]

    # 1. Structured prediction
    structured_top5 = structured_predictor.predict_top5(symptoms, demographics)
    structured_proba_full = structured_predictor.predict_proba(symptoms, demographics)

    # 2. Image prediction (if provided)
    image_result = None
    image_proba_full = None
    image_disease_map = None  # we need to map image classes to structured diseases
    if image_file:
        # Save temporarily
        filename = secure_filename(image_file.filename)
        temp_path = os.path.join('/tmp', filename)
        image_file.save(temp_path)
        with open(temp_path, 'rb') as f:
            disease, conf, probs, heatmap = image_predictor.predict(f)
        os.remove(temp_path)
        image_result = {
            'disease': disease,
            'confidence': conf,
            'heatmap': heatmap.tolist()  # or encode as base64 later
        }
        image_proba_full = probs
        # Map image disease to structured disease name (simplified)
        # In practice, you'd have a dictionary like: {'Melanoma': 'UMLS:C0025202_melanoma', ...}
        # For now, we'll skip mapping and not use image in fusion.
        image_disease_map = None

    # 3. Fuse if both available
    if image_proba_full is not None and image_disease_map is not None:
        fused_proba, agreement = fusion.fuse(
            structured_proba_full,
            image_proba_full,
            structured_predictor.le.classes_.tolist(),
            image_disease_map
        )
        # Get top5 from fused
        top5_idx = np.argsort(fused_proba)[-5:][::-1]
        top5_diseases = structured_predictor.le.inverse_transform(top5_idx)
        top5_proba = fused_proba[top5_idx]
        final_top5 = list(zip(top5_diseases, top5_proba))
    else:
        final_top5 = structured_top5
        agreement = 'image_not_used' if image_file else 'structured_only'

    # 4. Knowledge graph enhancement (optional ranking adjustment)
    kg_diseases = kg.get_related_diseases(symptoms)
    # Could use kg_diseases to re‑rank final_top5, but for now just include

    # 5. Risk assessment based on top confidence and urgency rules
    risk_level, urgency = assess_risk(final_top5[0][1], symptoms, demographics)

    # 6. Generate SHAP explanations
    shap_top = structured_predictor.explain(symptoms, demographics)

    # 7. Save diagnosis record
    diagnosis_record = {
        'user_id': ObjectId(user_id),
        'symptoms': symptoms,
        'demographics': demographics,
        'structured_top5': structured_top5,
        'image_result': image_result,
        'final_top5': final_top5,
        'risk_level': risk_level,
        'urgency': urgency,
        'agreement': agreement,
        'kg_suggestions': kg_diseases[:5],
        'shap_explanations': shap_top,
        'created_at': datetime.utcnow()
    }
    result = current_app.db.diagnoses.insert_one(diagnosis_record)
    diagnosis_id = str(result.inserted_id)

    # 8. Generate PDF report (async in production)
    pdf_path = generate_pdf_report(diagnosis_record, diagnosis_id, current_app.config['PDF_REPORT_DIR'])

    return jsonify({
        'diagnosis_id': diagnosis_id,
        'top5': [{'disease': d, 'confidence': float(c)} for d, c in final_top5],
        'risk_level': risk_level,
        'urgency': urgency,
        'agreement': agreement,
        'kg_suggestions': [d for d, s in kg_diseases[:5]],
        'explanations': [{'symptom': s, 'importance': float(imp)} for s, imp in shap_top],
        'image_result': image_result
    })

@diagnosis_bp.route('/report/<diagnosis_id>', methods=['GET'])
@jwt_required()
def get_report(diagnosis_id):
    # Check if user owns this diagnosis or is doctor
    user_id = get_jwt_identity()
    diagnosis = current_app.db.diagnoses.find_one({'_id': ObjectId(diagnosis_id)})
    if not diagnosis:
        return jsonify({'error': 'Not found'}), 404
    # Authorization: either patient who owns it or doctor
    user = current_app.db.users.find_one({'_id': ObjectId(user_id)})
    if str(diagnosis['user_id']) != user_id and user['role'] != 'doctor':
        return jsonify({'error': 'Unauthorized'}), 403

    pdf_path = os.path.join(current_app.config['PDF_REPORT_DIR'], f'diagnosis_{diagnosis_id}.pdf')
    if not os.path.exists(pdf_path):
        return jsonify({'error': 'Report not generated yet'}), 404

    return send_file(pdf_path, as_attachment=True, download_name=f'report_{diagnosis_id}.pdf')