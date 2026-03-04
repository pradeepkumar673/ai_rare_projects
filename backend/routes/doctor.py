 
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from datetime import datetime

doctor_bp = Blueprint('doctor', __name__)

def doctor_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = get_jwt_identity()
        user = current_app.db.users.find_one({'_id': ObjectId(user_id)})
        if not user or user['role'] != 'doctor':
            return jsonify({'error': 'Doctor access required'}), 403
        return f(*args, **kwargs)
    return decorated

@doctor_bp.route('/cases', methods=['GET'])
@jwt_required()
@doctor_required
def get_cases():
    # Return all diagnoses sorted by risk level (High > Medium > Low) and date
    pipeline = [
        {'$sort': {'risk_level': -1, 'created_at': -1}},
        {'$project': {
            'user_id': 1,
            'symptoms': 1,
            'final_top5': 1,
            'risk_level': 1,
            'urgency': 1,
            'created_at': 1,
            'agreement': 1
        }}
    ]
    cases = list(current_app.db.diagnoses.aggregate(pipeline))
    for case in cases:
        case['_id'] = str(case['_id'])
        case['user_id'] = str(case['user_id'])
    return jsonify(cases)

@doctor_bp.route('/case/<case_id>', methods=['GET'])
@jwt_required()
@doctor_required
def get_case(case_id):
    case = current_app.db.diagnoses.find_one({'_id': ObjectId(case_id)})
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    case['_id'] = str(case['_id'])
    case['user_id'] = str(case['user_id'])
    # Also fetch patient info
    patient = current_app.db.users.find_one({'_id': case['user_id']}, {'password': 0})
    patient['_id'] = str(patient['_id'])
    case['patient'] = patient
    return jsonify(case)

@doctor_bp.route('/case/<case_id>/accept', methods=['POST'])
@jwt_required()
@doctor_required
def accept_case(case_id):
    data = request.json
    doctor_id = get_jwt_identity()
    scheduled_time = data.get('scheduled_time')  # ISO string

    consultation = {
        'case_id': ObjectId(case_id),
        'doctor_id': ObjectId(doctor_id),
        'status': 'accepted',
        'scheduled_time': datetime.fromisoformat(scheduled_time) if scheduled_time else None,
        'created_at': datetime.utcnow()
    }
    result = current_app.db.consultations.insert_one(consultation)

    # Update diagnosis with consultation id
    current_app.db.diagnoses.update_one(
        {'_id': ObjectId(case_id)},
        {'$set': {'consultation_id': result.inserted_id}}
    )

    # In production, notify patient via email/websocket
    return jsonify({'message': 'Consultation scheduled', 'consultation_id': str(result.inserted_id)})

@doctor_bp.route('/case/<case_id>/reject', methods=['POST'])
@jwt_required()
@doctor_required
def reject_case(case_id):
    data = request.json
    doctor_id = get_jwt_identity()
    reason = data.get('reason', '')

    consultation = {
        'case_id': ObjectId(case_id),
        'doctor_id': ObjectId(doctor_id),
        'status': 'rejected',
        'reason': reason,
        'created_at': datetime.utcnow()
    }
    result = current_app.db.consultations.insert_one(consultation)

    # Optionally notify patient
    return jsonify({'message': 'Case rejected'})