from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from bson.objectid import ObjectId
from werkzeug.utils import secure_filename
import os
import tempfile
from datetime import datetime, timezone
import numpy as np

from models.structured_model import StructuredPredictor
from models.image_model import ImagePredictor
from models.fusion import MultimodalFusion
from knowledge_graph.builder import KnowledgeGraph
from utils.preprocessing import normalize_symptoms
from utils.explainability import generate_shap_plot
from utils.report_generator import generate_pdf_report
from utils.triage import assess_risk
from schemas import DiagnosisInput, validate_with_pydantic
from celery_app import generate_pdf_async, notify_user_task

diagnosis_bp = Blueprint('diagnosis', __name__)

# Rate limiter (already configured in app)
limiter = Limiter(key_func=get_remote_address)
cache = Cache()

# Load models (with error handling)
structured_predictor = None
image_predictor = None
fusion = None
kg = None

def load_models():
    global structured_predictor, image_predictor, fusion, kg
    try:
        structured_predictor = StructuredPredictor(
            rf_path=current_app.config['STRUCTURED_MODEL_PATH'],
            xgb_path=current_app.config['XGB_MODEL_PATH'],
            encoder_path=current_app.config['LABEL_ENCODER_PATH'],
            feature_names_path=current_app.config['FEATURE_NAMES_PATH']
        )
    except FileNotFoundError as e:
        current_app.logger.error(f"Structured model missing: {e}")
        structured_predictor = None

    try:
        image_predictor = ImagePredictor(current_app.config['IMAGE_MODEL_PATH'])
    except Exception as e:
        current_app.logger.error(f"Image model missing: {e}")
        image_predictor = None

    fusion = MultimodalFusion()
    kg = KnowledgeGraph(cache_path='kg_cache.pkl')  # uses synonym map if available

@diagnosis_bp.before_app_request
def before_first_request():
    load_models()

@diagnosis_bp.route('/predict', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def predict():
    user_id = get_jwt_identity()

    # Validate input using Pydantic
    data = request.form
    files = request.files
    try:
        validated = DiagnosisInput(
            symptoms=data.getlist('symptoms[]'),
            age=data.get('age', type=int),
            gender=data.get('gender'),
            ethnicity=data.get('ethnicity'),
            region=data.get('region'),
            consent=data.get('consent') == 'true',
            image=files.get('image')
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    if not validated.consent:
        return jsonify({'error': 'Consent must be given'}), 400

    if structured_predictor is None:
        return jsonify({'error': 'Model not available'}), 503

    symptoms = normalize_symptoms(validated.symptoms)
    demographics = {
        'age': validated.age,
        'gender': validated.gender,
        'ethnicity': validated.ethnicity,
        'region': validated.region
    }

    # Structured prediction
    structured_top5 = structured_predictor.predict_top5(symptoms, demographics)
    structured_proba_full = structured_predictor.predict_proba(symptoms, demographics)

    # Image prediction (if provided)
    image_result = None
    image_proba_full = None
    image_idx_to_name = None
    if validated.image and image_predictor:
        # Save uploaded file to temp
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            validated.image.save(tmp.name)
            with open(tmp.name, 'rb') as f:
                disease, conf, probs, heatmap = image_predictor.predict(f)
            os.unlink(tmp.name)
        image_result = {
            'disease': disease,
            'confidence': conf,
            'heatmap': heatmap.tolist()
        }
        image_proba_full = probs
        # Map image indices to structured disease names
        image_idx_to_name = {i: disease for i, disease in image_predictor.idx_to_disease.items()}

    # Fusion
    if image_proba_full is not None and image_idx_to_name is not None:
        fused_proba, agreement = fusion.fuse(
            structured_proba_full,
            image_proba_full,
            structured_predictor.le.classes_.tolist(),
            image_idx_to_name
        )
        # Get top5 from fused
        top5_idx = np.argsort(fused_proba)[-5:][::-1]
        top5_diseases = structured_predictor.le.inverse_transform(top5_idx)
        top5_proba = fused_proba[top5_idx]
        final_top5 = list(zip(top5_diseases, top5_proba))
    else:
        final_top5 = structured_top5
        agreement = 'image_not_used' if validated.image else 'structured_only'

    # Knowledge graph enhancement
    kg_diseases = kg.get_related_diseases(symptoms)
    # Re‑rank final_top5 using KG scores (if any)
    kg_dict = {d: s for d, s in kg_diseases}
    max_kg = max(kg_dict.values()) if kg_dict else 1.0
    reranked = []
    for disease, prob in final_top5:
        kg_score = kg_dict.get(disease, 0.0)
        new_score = prob * (1 + kg_score / max_kg) if max_kg else prob
        reranked.append((disease, new_score))
    # Sort again
    reranked.sort(key=lambda x: x[1], reverse=True)
    final_top5 = reranked[:5]

    # Risk assessment
    risk_level, urgency = assess_risk(final_top5[0][1], symptoms, demographics)

    # SHAP explanations
    shap_top = structured_predictor.explain(symptoms, demographics)

    # Save diagnosis record
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
        'consent': validated.consent,
        'created_at': datetime.now(timezone.utc)
    }
    result = current_app.db.diagnoses.insert_one(diagnosis_record)
    diagnosis_id = str(result.inserted_id)

    # Async PDF generation and notification
    generate_pdf_async.delay(diagnosis_record, diagnosis_id)

    # Audit log
    current_app.db.audit_logs.insert_one({
        'action': 'diagnosis_predict',
        'user_id': ObjectId(user_id),
        'diagnosis_id': result.inserted_id,
        'ip': request.remote_addr,
        'ts': datetime.now(timezone.utc)
    })

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
@cache.cached(timeout=300, query_string=True)
def get_report(diagnosis_id):
    user_id = get_jwt_identity()
    diagnosis = current_app.db.diagnoses.find_one({'_id': ObjectId(diagnosis_id)})
    if not diagnosis:
        return jsonify({'error': 'Not found'}), 404

    user = current_app.db.users.find_one({'_id': ObjectId(user_id)})
    if str(diagnosis['user_id']) != user_id and user['role'] != 'doctor':
        return jsonify({'error': 'Unauthorized'}), 403

    pdf_path = os.path.join(current_app.config['PDF_REPORT_DIR'], f'diagnosis_{diagnosis_id}.pdf')
    if not os.path.exists(pdf_path):
        return jsonify({'error': 'Report not generated yet'}), 404

    # Audit log
    current_app.db.audit_logs.insert_one({
        'action': 'download_report',
        'user_id': ObjectId(user_id),
        'diagnosis_id': ObjectId(diagnosis_id),
        'ip': request.remote_addr,
        'ts': datetime.now(timezone.utc)
    })

    return send_file(pdf_path, as_attachment=True, download_name=f'report_{diagnosis_id}.pdf')