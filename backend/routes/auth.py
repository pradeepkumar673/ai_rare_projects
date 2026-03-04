 
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from bson.objectid import ObjectId
import re

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'patient')  # default patient
    name = data.get('name')

    # Basic validation
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({'error': 'Invalid email'}), 400

    # Check if user exists
    db = current_app.db
    if db.users.find_one({'email': email}):
        return jsonify({'error': 'Email already registered'}), 409

    # Hash password
    hashed = generate_password_hash(password)

    # Insert user
    user_id = db.users.insert_one({
        'email': email,
        'password': hashed,
        'role': role,
        'name': name,
        'created_at': datetime.utcnow()
    }).inserted_id

    return jsonify({'message': 'User created', 'user_id': str(user_id)}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = current_app.db.users.find_one({'email': email})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid credentials'}), 401

    # Create tokens
    access_token = create_access_token(identity=str(user['_id']), additional_claims={'role': user['role']})
    refresh_token = create_refresh_token(identity=str(user['_id']))

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user_id': str(user['_id']),
        'role': user['role']
    })

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    new_access = create_access_token(identity=identity)
    return jsonify({'access_token': new_access})

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = current_app.db.users.find_one({'_id': ObjectId(user_id)}, {'password': 0})
    user['_id'] = str(user['_id'])
    return jsonify(user)