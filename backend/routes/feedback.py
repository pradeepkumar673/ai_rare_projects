"""
Feedback endpoint for users and doctors.
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from datetime import datetime, timezone
from typing import Dict, Any

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/', methods=['POST'])
@jwt_required()
def submit_feedback() -> Dict[str, Any]:
    user_id = get_jwt_identity()
    data = request.json or {}
    diagnosis_id = data.get('diagnosis_id')
    rating = data.get('rating')
    comments = data.get('comments')
    correct_diagnosis = data.get('correct_diagnosis')

    # Fetch demographics from the diagnosis for bias audit
    demographics = {}
    if diagnosis_id:
        diagnosis = current_app.db.diagnoses.find_one({'_id': ObjectId(diagnosis_id)})
        if diagnosis:
            demographics = diagnosis.get('demographics', {})

    feedback = {
        'user_id': ObjectId(user_id),
        'diagnosis_id': ObjectId(diagnosis_id) if diagnosis_id else None,
        'rating': rating,
        'comments': comments,
        'correct_diagnosis': correct_diagnosis,
        'demographics': demographics,
        'created_at': datetime.now(timezone.utc)
    }
    current_app.db.feedback.insert_one(feedback)

    # If correct_diagnosis provided, we can later use it to improve model
    return jsonify({'message': 'Feedback received'}), 201