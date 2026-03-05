"""
Diagnosis prediction endpoint with multimodal fusion, KG, and async PDF.
"""
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from werkzeug.utils import secure_filename
import os
import tempfile
from datetime import datetime, timezone
import numpy as np
from typing import Dict, Any, List, Optional
import base64
import cv2
from PIL import Image as PILImage

from models.structured_model import StructuredPredictor
from models.image_model import ImagePredictor
from models.fusion import MultimodalFusion
from knowledge_graph.builder import KnowledgeGraph
from utils.preprocessing import normalize_symptoms
from utils.explainability import generate_shap_plot
from utils.report_generator import generate_pdf_report
from utils.triage import assess_risk
from schemas import DiagnosisInput

diagnosis_bp = Blueprint('diagnosis', __name__)

# -------------------------------------------------------------------
# Helper to get models from app context
# -------------------------------------------------------------------
def get_structured_predictor():
    return getattr(current_app, 'structured_predictor', None)

def get_image_predictor():
    return getattr(current_app, 'image_predictor', None)

def get_fusion():
    return getattr(current_app, 'fusion', None)

def get_kg():
    return getattr(current_app, 'kg', None)


# -------------------------------------------------------------------
# Prediction endpoint
# -------------------------------------------------------------------
@diagnosis_bp.route('/predict', methods=['POST'])
@jwt_required()
def predict() -> Dict[str, Any]:
    user_id = get_jwt_identity()

    structured = get_structured_predictor()
    if structured is None:
        return jsonify({'error': 'Model not available'}), 503

    # Parse form data
    form = request.form
    files = request.files

    # Pydantic validation
    try:
        validated = DiagnosisInput(
            symptoms=form.getlist('symptoms[]'),
            age=int(form.get('age')) if form.get('age') else None,
            gender=form.get('gender'),
            ethnicity=form.get('ethnicity'),
            region=form.get('region'),
            consent=form.get('consent', 'false').lower() == 'true',
            image=files.get('image')
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    if not validated.consent:
        return jsonify({'error': 'Consent must be given'}), 400

    symptoms = validated.symptoms
    demographics = {
        'age': validated.age,
        'gender': validated.gender,
        'ethnicity': validated.ethnicity,
        'region': validated.region
    }

    # Structured prediction
    structured_top5 = structured.predict_top5(symptoms, demographics)
    structured_proba_full = structured.predict_proba(symptoms, demographics)
    shap_top, shap_values_full = structured.explain(symptoms, demographics)

    # Image prediction (if provided)
    image_result: Optional[Dict[str, Any]] = None
    image_proba_full: Optional[np.ndarray] = None
    image_idx_to_name: Optional[Dict[int, str]] = None
    image_overlay_b64: Optional[str] = None

    image_predictor = get_image_predictor()
    if validated.image and image_predictor:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            validated.image.save(tmp.name)
            with open(tmp.name, 'rb') as f:
                disease, conf, probs, heatmap = image_predictor.predict(f)
            original = cv2.imread(tmp.name)
            if original is not None:
                heatmap_colored = cv2.applyColorMap((heatmap * 255).astype(np.uint8), cv2.COLORMAP_JET)
                overlay = cv2.addWeighted(original, 0.6, heatmap_colored, 0.4, 0)
                overlay_path = tmp.name.replace('.jpg', '_overlay.png')
                cv2.imwrite(overlay_path, overlay)
                with open(overlay_path, 'rb') as f_overlay:
                    overlay_b64 = base64.b64encode(f_overlay.read()).decode('utf-8')
                os.unlink(overlay_path)
                image_overlay_b64 = overlay_b64
            os.unlink(tmp.name)

        image_result = {
            'disease': disease,
            'confidence': conf,
            'heatmap': heatmap.tolist(),
            'overlay_b64': image_overlay_b64
        }
        image_proba_full = probs
        image_idx_to_name = {i: d for i, d in image_predictor.idx_to_disease.items()}

    # Fusion
    fusion = get_fusion()
    if image_proba_full is not None and image_idx_to_name is not None and fusion:
        fused_proba, agreement = fusion.fuse(
            structured_proba_full,
            image_proba_full,
            structured.le.classes_.tolist(),
            image_idx_to_name
        )
        top5_idx = np.argsort(fused_proba)[-5:][::-1]
        top5_diseases = structured.le.inverse_transform(top5_idx)
        top5_proba = fused_proba[top5_idx]
        final_top5 = list(zip(top5_diseases, top5_proba))
    else:
        final_top5 = structured_top5
        agreement = 'image_not_used' if validated.image else 'structured_only'

    # Knowledge graph enhancement
    kg = get_kg()
    kg_diseases: List[tuple] = []
    if kg:
        kg_diseases = kg.get_related_diseases(symptoms)
        kg_dict = {d: s for d, s in kg_diseases}
        max_kg = max(kg_dict.values()) if kg_dict else 1.0
        reranked = []
        for disease, prob in final_top5:
            kg_score = kg_dict.get(disease, 0.0)
            new_score = prob * (1 + kg_score / max_kg) if max_kg else prob
            reranked.append((disease, new_score))
        reranked.sort(key=lambda x: x[1], reverse=True)
        final_top5 = reranked[:5]

    # Risk assessment
    risk_level, urgency = assess_risk(final_top5[0][1], symptoms, demographics, kg)

    # ------------------------------------------------------------------
    # Enrich top diseases with KB info (description, icd_code, category)
    # ------------------------------------------------------------------
    kb_info_map: Dict[str, Dict] = {}
    if hasattr(structured, 'get_disease_info'):
        # RareDiseasePredictor has get_disease_info
        for disease_name, _ in final_top5:
            info = structured.get_disease_info(disease_name)
            if info:
                kb_info_map[disease_name] = info
    elif hasattr(structured, 'diseases'):
        # Also try direct diseases list
        for d in structured.diseases:
            kb_info_map[d['name']] = d

    # Build enriched top_diseases list for the response
    top_diseases = []
    for disease_name, prob in final_top5:
        info = kb_info_map.get(disease_name, {})
        entry: Dict[str, Any] = {
            'name': disease_name,
            'probability': float(prob),
        }
        if info.get('description'):
            entry['description'] = info['description']
        if info.get('orpha_code'):
            entry['icd_code'] = f"ORPHA:{info['orpha_code']}"
        if info.get('category'):
            entry['category'] = info['category']
        top_diseases.append(entry)

    confidence = float(final_top5[0][1]) if final_top5 else 0.0

    # Normalize risk/urgency
    risk_map = {'High': 'high', 'Medium': 'medium', 'Low': 'low'}
    urgency_map = {
        'Emergency': 'immediate',
        'Immediate': 'immediate',
        'Immediate (within 24h)': 'immediate',
        'Immediate (rare cluster)': 'immediate',
        'Soon (within 1 week)': 'soon',
        'Routine (schedule appointment)': 'routine',
    }
    normalized_risk = risk_map.get(risk_level, risk_level.lower())
    normalized_urgency = urgency_map.get(urgency, 'routine')

    # ------------------------------------------------------------------
    # Build a rich KG reasoning snippet
    # ------------------------------------------------------------------
    top_disease_name = final_top5[0][0] if final_top5 else 'Unknown'
    top_info = kb_info_map.get(top_disease_name, {})
    matched_symptoms = []
    if top_info.get('symptoms'):
        disease_syms = [s.lower() for s in top_info['symptoms']]
        matched_symptoms = [s for s in symptoms if s.lower() in disease_syms]

    kg_snippet_parts = []

    # Primary diagnosis explanation
    if top_info.get('description'):
        kg_snippet_parts.append(f"Primary AI Prediction: {top_disease_name}\n{top_info['description']}")
    else:
        kg_snippet_parts.append(f"Primary AI Prediction: {top_disease_name}")

    # Symptom match explanation
    if matched_symptoms:
        kg_snippet_parts.append(
            f"\nMatched Symptoms: {len(matched_symptoms)} of your symptoms align with {top_disease_name} — "
            f"specifically: {', '.join(matched_symptoms[:5])}{'...' if len(matched_symptoms) > 5 else ''}."
        )

    # Required symptoms note
    if top_info.get('required'):
        required = top_info['required']
        matched_req = [r for r in required if r.lower() in [s.lower() for s in symptoms]]
        if matched_req:
            kg_snippet_parts.append(
                f"\nKey Diagnostic Criteria Met: {', '.join(matched_req)} — these are hallmark features of {top_disease_name}."
            )
        else:
            kg_snippet_parts.append(
                f"\nNote: Classic required criteria ({', '.join(required)}) were not reported. Consider further evaluation."
            )

    # KG matches
    if kg_diseases:
        kg_snippet_parts.append(
            f"\nKnowledge Graph Analysis: Found {len(kg_diseases)} candidate diseases. "
            f"Top KG matches: {', '.join(d for d, _ in kg_diseases[:3])}."
        )
    else:
        kg_snippet_parts.append(
            "\nKnowledge Graph Analysis: No strong graph matches found. Prediction is based on symptom pattern analysis alone."
        )

    # Category info
    if top_info.get('category'):
        kg_snippet_parts.append(f"\nDisease Category: {top_info['category']}")

    kg_snippet = '\n'.join(kg_snippet_parts)

    # ------------------------------------------------------------------
    # Build SHAP values — use symptom names with their importance scores
    # ------------------------------------------------------------------
    # shap_top is a list of (symptom_name, importance_float)
    shap_values_response = [
        {'symptom': s, 'importance': float(imp)}
        for s, imp in shap_top
        if float(imp) > 0
    ]

    # If shap is empty/zero (common with KB predictor), fall back to
    # showing which of the patient's symptoms matched the top disease
    if not shap_values_response and symptoms:
        disease_syms_set = set(top_info.get('symptoms', []))
        required_set = set(s.lower() for s in top_info.get('required', []))
        for sym in symptoms:
            sym_lower = sym.lower()
            if sym_lower in required_set:
                importance = 1.0
            elif sym_lower in [s.lower() for s in disease_syms_set]:
                importance = 0.6
            else:
                importance = 0.1
            shap_values_response.append({'symptom': sym, 'importance': importance})
        shap_values_response.sort(key=lambda x: x['importance'], reverse=True)

    # Save diagnosis record
    diagnosis_record: Dict[str, Any] = {
        'user_id': ObjectId(user_id),
        'symptoms': symptoms,
        'demographics': demographics,
        'structured_top5': [(d, float(p)) for d, p in structured_top5],
        'image_result': image_result,
        'final_top5': [(d, float(p)) for d, p in final_top5],
        'risk_level': risk_level,
        'urgency': urgency,
        'agreement': agreement,
        'kg_suggestions': [d for d, _ in kg_diseases[:5]],
        'shap_explanations': [(s, float(imp)) for s, imp in shap_top],
        'shap_values': shap_values_full.tolist() if hasattr(shap_values_full, 'tolist') else list(shap_values_full),
        'consent': validated.consent,
        'created_at': datetime.now(timezone.utc)
    }
    result = current_app.db.diagnoses.insert_one(diagnosis_record)
    diagnosis_id = str(result.inserted_id)

    # PDF generation
    try:
        generate_pdf_report(diagnosis_record, diagnosis_id, current_app.config['PDF_REPORT_DIR'])
    except Exception as e:
        current_app.logger.error(f"PDF generation failed: {e}")

    # Audit log
    current_app.db.audit_logs.insert_one({
        'action': 'diagnosis_predict',
        'user_id': ObjectId(user_id),
        'diagnosis_id': result.inserted_id,
        'ip': request.remote_addr,
        'ts': datetime.now(timezone.utc)
    })

    response: Dict[str, Any] = {
        'case_id': diagnosis_id,
        'top_diseases': top_diseases,           # ← now includes description, icd_code, category
        'confidence': confidence,
        'risk_level': normalized_risk,
        'urgency': normalized_urgency,
        'shap_values': shap_values_response,    # ← now always populated
        'kg_reasoning_snippet': kg_snippet,     # ← now rich multi-line explanation
        'kg_suggestions': [d for d, _ in kg_diseases[:5]],
        'agreement': agreement,
        'specialist_review': agreement == 'low' and normalized_risk == 'high',
        'image_result': image_result,
        'created_at': datetime.now(timezone.utc).isoformat(),
        # Legacy fields
        'diagnosis_id': diagnosis_id,
        'top5': [{'disease': d, 'confidence': float(c)} for d, c in final_top5],
        'risk_level_raw': risk_level,
        'urgency_raw': urgency,
        'explanations': [{'symptom': s, 'importance': float(imp)} for s, imp in shap_top],
    }

    return jsonify(response)


# -------------------------------------------------------------------
# Report download
# -------------------------------------------------------------------
@diagnosis_bp.route('/report/<diagnosis_id>', methods=['GET'])
@jwt_required()
def get_report(diagnosis_id: str):
    user_id = get_jwt_identity()
    diagnosis = current_app.db.diagnoses.find_one({'_id': ObjectId(diagnosis_id)})
    if not diagnosis:
        return jsonify({'error': 'Not found'}), 404

    user = current_app.db.users.find_one({'_id': ObjectId(user_id)})
    if str(diagnosis['user_id']) != user_id and user.get('role') != 'doctor':
        return jsonify({'error': 'Unauthorized'}), 403

    pdf_path = os.path.join(current_app.config['PDF_REPORT_DIR'], f'diagnosis_{diagnosis_id}.pdf')
    if not os.path.exists(pdf_path):
        return jsonify({'error': 'Report not generated yet'}), 404

    current_app.db.audit_logs.insert_one({
        'action': 'download_report',
        'user_id': ObjectId(user_id),
        'diagnosis_id': ObjectId(diagnosis_id),
        'ip': request.remote_addr,
        'ts': datetime.now(timezone.utc)
    })

    return send_file(pdf_path, as_attachment=True, download_name=f'report_{diagnosis_id}.pdf')