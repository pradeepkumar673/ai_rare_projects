 
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from datetime import datetime

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/', methods=['POST'])
@jwt_required()
def submit_feedback():
    user_id = get_jwt_identity()
    data = request.json
    diagnosis_id = data.get('diagnosis_id')
    rating = data.get('rating')  # 1-5
    comments = data.get('comments')
    correct_diagnosis = data.get('correct_diagnosis')  # optional

    feedback = {
        'user_id': ObjectId(user_id),
        'diagnosis_id': ObjectId(diagnosis_id) if diagnosis_id else None,
        'rating': rating,
        'comments': comments,
        'correct_diagnosis': correct_diagnosis,
        'created_at': datetime.utcnow()
    }
    current_app.db.feedback.insert_one(feedback)

    # If correct_diagnosis provided, we can later use it to improve model
    return jsonify({'message': 'Feedback received'}), 201