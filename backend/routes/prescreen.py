"""
backend/routes/prescreen.py
────────────────────────────
Flask blueprint for storing and retrieving pre-screen bot answers.

Register in app.py:
    from routes.prescreen import prescreen_bp
    app.register_blueprint(prescreen_bp, url_prefix='/api/prescreen')

MongoDB collection: pre_screen_answers
Indexes: diagnosis_id, user_id, created_at
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from datetime import datetime, timezone
from typing import Dict, Any
import structlog

prescreen_bp = Blueprint('prescreen', __name__)
logger = structlog.get_logger()

# ─── Expected answer keys ─────────────────────────────────────────────────────

REQUIRED_FIELDS = [
    'lesion_duration',
    'is_bleeding',
    'size_changed',
    'pain_level',
]

OPTIONAL_FIELDS = [
    'pain_description',
    'previous_treatment',
    'family_history',
    'recent_sun_exposure',
    'other_symptoms',
    'patient_concern',
    'triage_flags',
    'completed_at',
]

ALL_FIELDS = REQUIRED_FIELDS + OPTIONAL_FIELDS


# ─── POST /api/prescreen/submit ───────────────────────────────────────────────

@prescreen_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_answers() -> Dict[str, Any]:
    """
    Patient submits pre-screen answers after bot conversation.

    Body (JSON):
        diagnosis_id   str   – ObjectId of the related diagnosis record
        consult_type   str   – 'video' | 'voice' | 'chat'
        answers        dict  – PreScreenAnswers object from frontend bot

    Returns:
        { prescreen_id: str, triage_flags: list[str] }
    """
    user_id = get_jwt_identity()
    data = request.get_json(force=True) or {}

    diagnosis_id = data.get('diagnosis_id')
    consult_type  = data.get('consult_type', 'chat')
    raw_answers   = data.get('answers', {})

    if not diagnosis_id:
        return jsonify({'error': 'diagnosis_id is required'}), 400

    # Validate required fields
    missing = [f for f in REQUIRED_FIELDS if f not in raw_answers]
    if missing:
        return jsonify({'error': f'Missing required answer fields: {missing}'}), 400

    # Sanitise — only accept known fields
    answers: Dict[str, Any] = {k: raw_answers[k] for k in ALL_FIELDS if k in raw_answers}

    # Enforce pain_level as int 0-10
    try:
        answers['pain_level'] = max(0, min(10, int(answers.get('pain_level', 0))))
    except (ValueError, TypeError):
        answers['pain_level'] = 0

    # Compute server-side triage flags (authoritative copy)
    flags = _compute_triage_flags(answers)
    answers['triage_flags'] = flags

    # Lookup diagnosis to confirm ownership
    try:
        diagnosis = current_app.db.diagnoses.find_one({'_id': ObjectId(diagnosis_id)})
    except Exception:
        return jsonify({'error': 'Invalid diagnosis_id'}), 400

    if not diagnosis:
        return jsonify({'error': 'Diagnosis not found'}), 404

    if str(diagnosis.get('user_id')) != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    # Derive risk level from diagnosis for flag enrichment
    risk_level = diagnosis.get('risk_level', 'low')
    if isinstance(risk_level, str) and risk_level.lower() in ('high', 'High'):
        flags.append('🔴 AI: High risk classification')
        flags = list(dict.fromkeys(flags))  # deduplicate

    # Build document
    doc = {
        'user_id':         ObjectId(user_id),
        'diagnosis_id':    ObjectId(diagnosis_id),
        'consult_type':    consult_type,
        'answers':         answers,
        'triage_flags':    flags,
        'top_disease':     diagnosis.get('final_top5', [[None]])[0][0] if diagnosis.get('final_top5') else None,
        'ai_risk_level':   risk_level,
        'created_at':      datetime.now(timezone.utc),
    }

    result = current_app.db.pre_screen_answers.insert_one(doc)
    prescreen_id = str(result.inserted_id)

    # Back-link to diagnosis record for easy doctor lookup
    current_app.db.diagnoses.update_one(
        {'_id': ObjectId(diagnosis_id)},
        {'$set': {
            'pre_screen_id':    result.inserted_id,
            'pre_screen_flags': flags,
            'consult_type':     consult_type,
        }}
    )

    # Audit log
    current_app.db.audit_logs.insert_one({
        'action':        'prescreen_submit',
        'user_id':       ObjectId(user_id),
        'diagnosis_id':  ObjectId(diagnosis_id),
        'prescreen_id':  result.inserted_id,
        'triage_flags':  flags,
        'ip':            request.remote_addr,
        'ts':            datetime.now(timezone.utc),
    })

    logger.info('prescreen_submitted', user_id=user_id, diagnosis_id=diagnosis_id, flags=len(flags))

    return jsonify({
        'prescreen_id':  prescreen_id,
        'triage_flags':  flags,
        'message':       'Pre-screen answers saved',
    }), 201


# ─── GET /api/prescreen/<diagnosis_id> ────────────────────────────────────────

@prescreen_bp.route('/<diagnosis_id>', methods=['GET'])
@jwt_required()
def get_answers(diagnosis_id: str) -> Dict[str, Any]:
    """
    Doctor or patient retrieves pre-screen answers for a diagnosis.

    Returns the full answers dict plus triage_flags and metadata.
    Doctors can access any case; patients only their own.
    """
    user_id = get_jwt_identity()
    user = current_app.db.users.find_one({'_id': ObjectId(user_id)})
    is_doctor = user and user.get('role') == 'doctor'

    try:
        doc = current_app.db.pre_screen_answers.find_one(
            {'diagnosis_id': ObjectId(diagnosis_id)}
        )
    except Exception:
        return jsonify({'error': 'Invalid diagnosis_id'}), 400

    if not doc:
        return jsonify({'error': 'Pre-screen answers not found for this diagnosis'}), 404

    # Authorisation
    if not is_doctor and str(doc.get('user_id')) != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    response = {
        'prescreen_id':  str(doc['_id']),
        'diagnosis_id':  diagnosis_id,
        'consult_type':  doc.get('consult_type'),
        'answers':       doc.get('answers', {}),
        'triage_flags':  doc.get('triage_flags', []),
        'top_disease':   doc.get('top_disease'),
        'ai_risk_level': doc.get('ai_risk_level'),
        'created_at':    doc.get('created_at').isoformat() if doc.get('created_at') else None,
    }

    # Doctor access audit
    if is_doctor:
        current_app.db.audit_logs.insert_one({
            'action':       'doctor_view_prescreen',
            'user_id':      ObjectId(user_id),
            'diagnosis_id': ObjectId(diagnosis_id),
            'ip':           request.remote_addr,
            'ts':           datetime.now(timezone.utc),
        })

    return jsonify(response)


# ─── GET /api/prescreen/queue/flagged ─────────────────────────────────────────

@prescreen_bp.route('/queue/flagged', methods=['GET'])
@jwt_required()
def get_flagged_queue() -> Dict[str, Any]:
    """
    Doctor endpoint: returns all pre-screens with ≥1 triage flag,
    sorted by flag count (most critical first).

    Query params:
        limit  int  (default 20)
        skip   int  (default 0)
    """
    user_id = get_jwt_identity()
    user = current_app.db.users.find_one({'_id': ObjectId(user_id)})
    if not user or user.get('role') != 'doctor':
        return jsonify({'error': 'Doctor access required'}), 403

    limit = min(int(request.args.get('limit', 20)), 100)
    skip  = int(request.args.get('skip', 0))

    pipeline = [
        {'$match': {'triage_flags': {'$exists': True, '$not': {'$size': 0}}}},
        {'$addFields': {'flag_count': {'$size': '$triage_flags'}}},
        {'$sort': {'flag_count': -1, 'created_at': -1}},
        {'$skip': skip},
        {'$limit': limit},
        {'$project': {
            'diagnosis_id': 1,
            'triage_flags': 1,
            'flag_count':   1,
            'top_disease':  1,
            'ai_risk_level': 1,
            'consult_type': 1,
            'created_at':   1,
            'answers.pain_level':    1,
            'answers.is_bleeding':   1,
            'answers.size_changed':  1,
        }}
    ]

    docs = list(current_app.db.pre_screen_answers.aggregate(pipeline))
    for d in docs:
        d['_id']          = str(d['_id'])
        d['diagnosis_id'] = str(d['diagnosis_id'])
        if d.get('created_at'):
            d['created_at'] = d['created_at'].isoformat()

    return jsonify({'cases': docs, 'total': len(docs)})


# ─── Server-side triage flag computation ─────────────────────────────────────

def _compute_triage_flags(answers: Dict[str, Any]) -> list:
    flags = []
    if answers.get('is_bleeding') == 'Yes':
        flags.append('🩸 Active bleeding reported')
    pain = answers.get('pain_level', 0)
    if isinstance(pain, (int, float)) and pain >= 8:
        flags.append(f'⚠️ Severe pain ({pain}/10)')
    size = answers.get('size_changed', '')
    if 'getting worse' in size.lower() or 'worse' in size.lower():
        flags.append('📈 Rapidly worsening symptoms')
    duration = answers.get('lesion_duration', '')
    if 'over a year' in duration.lower() or '3–6 months' in duration.lower():
        flags.append('⏱️ Long-standing condition')
    other = answers.get('other_symptoms', '').lower()
    if 'weight loss' in other:
        flags.append('⚖️ Unexplained weight loss')
    if 'lymph' in other:
        flags.append('🔵 Lymphadenopathy noted')
    if answers.get('family_history') == 'Yes':
        flags.append('🧬 Positive family history')
    return flags


# ─── DB index setup helper (call from app.py) ──────────────────────────────────

def setup_prescreen_indexes(db) -> None:
    """
    Call once from app.py after db is available:
        from routes.prescreen import setup_prescreen_indexes
        setup_prescreen_indexes(db)
    """
    db.pre_screen_answers.create_index('diagnosis_id', unique=True)
    db.pre_screen_answers.create_index('user_id')
    db.pre_screen_answers.create_index('created_at')
    db.pre_screen_answers.create_index([('triage_flags', 1), ('created_at', -1)])
