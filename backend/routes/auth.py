"""
Authentication endpoints with JWT.
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from bson.objectid import ObjectId
from datetime import datetime, timezone
import re
from typing import Dict, Any

auth_bp = Blueprint('auth', __name__)

def validate_password(password: str) -> bool:
    """At least 8 chars, one uppercase, one digit, one symbol."""
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'\d', password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    return True

def serialize_user(user: dict) -> dict:
    """
    Convert a MongoDB user document into the shape the frontend expects:
    { id, email, name, role, specialty?, avatar? }
    """
    return {
        'id': str(user['_id']),
        'email': user.get('email', ''),
        'name': user.get('name', ''),
        'role': user.get('role', 'user'),
        'specialty': user.get('specialty'),
        'avatar': user.get('avatar'),
    }

@auth_bp.route('/register', methods=['POST'])
def register() -> Dict[str, Any]:
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'user')
    name = data.get('name', '')
    specialty = data.get('specialty')
    license_number = data.get('licenseNumber')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({'error': 'Invalid email'}), 400
    if not validate_password(password):
        return jsonify({
            'error': 'Password must be at least 8 characters with one uppercase, one digit, and one symbol',
            'message': 'Password must be at least 8 characters with one uppercase, one digit, and one symbol'
        }), 400

    db = current_app.db

    if db.users.find_one({'email': email}):
        return jsonify({'error': 'Email already registered', 'message': 'Email already registered'}), 409

    hashed = generate_password_hash(password)
    user_doc = {
        'email': email,
        'password': hashed,
        'role': role,
        'name': name,
        'specialty': specialty,
        'licenseNumber': license_number,
        'created_at': datetime.now(timezone.utc)
    }
    user_id = db.users.insert_one(user_doc).inserted_id
    user_doc['_id'] = user_id

    db.audit_logs.insert_one({
        'action': 'user_register',
        'user_id': user_id,
        'ip': request.remote_addr,
        'ts': datetime.now(timezone.utc)
    })

    # Return token + user so frontend can log the user in immediately after register
    access_token = create_access_token(
        identity=str(user_id),
        additional_claims={'role': role}
    )

    return jsonify({
        'token': access_token,
        'user': serialize_user(user_doc),
        # Legacy fields kept for any other consumers
        'user_id': str(user_id),
        'message': 'User created',
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login() -> Dict[str, Any]:
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password required', 'message': 'Email and password required'}), 400

    user = current_app.db.users.find_one({'email': email})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid credentials', 'message': 'Invalid credentials'}), 401

    access_token = create_access_token(
        identity=str(user['_id']),
        additional_claims={'role': user['role']}
    )
    refresh_token = create_refresh_token(identity=str(user['_id']))

    current_app.db.audit_logs.insert_one({
        'action': 'user_login',
        'user_id': user['_id'],
        'ip': request.remote_addr,
        'ts': datetime.now(timezone.utc)
    })

    return jsonify({
        # Shape the frontend expects: { token, user }
        'token': access_token,
        'user': serialize_user(user),
        # Additional fields kept for completeness
        'refresh_token': refresh_token,
        'access_token': access_token,
        'user_id': str(user['_id']),
        'role': user['role'],
    })


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh() -> Dict[str, Any]:
    identity = get_jwt_identity()
    new_access = create_access_token(identity=identity)
    return jsonify({'access_token': new_access, 'token': new_access})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me() -> Dict[str, Any]:
    user_id = get_jwt_identity()
    user = current_app.db.users.find_one({'_id': ObjectId(user_id)}, {'password': 0})
    if not user:
        return jsonify({'error': 'User not found'}), 404
    # Return the same shape the frontend User interface expects
    return jsonify(serialize_user(user))