import re
from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
from utils.auth_helper import encode_auth_token, token_required
from utils.limiter import limiter

auth_bp = Blueprint('auth', __name__)

EMAIL_REGEX = r'^[\w\.-]+@[\w\.-]+\.\w+$'

@auth_bp.route('/auth/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    try:
        data = request.json or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400

        if not re.match(EMAIL_REGEX, email):
            return jsonify({"error": "Invalid email address format."}), 400

        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long."}), 400

        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"error": "An account with this email already exists."}), 409

        # Hash password and create user
        password_hash = generate_password_hash(password)
        new_user = User(email=email, password_hash=password_hash)
        db.session.add(new_user)
        db.session.commit()

        # Generate token right away so they are logged in upon sign-up
        token = encode_auth_token(new_user.id)
        
        return jsonify({
            "status": "success",
            "message": "User registered successfully.",
            "token": token,
            "email": new_user.email,
            "is_premium": new_user.is_premium
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Registration failed."}), 500

@auth_bp.route('/auth/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    try:
        data = request.json or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400

        # Find user
        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid email or password."}), 401

        # Generate token
        token = encode_auth_token(user.id)
        
        return jsonify({
            "status": "success",
            "token": token,
            "email": user.email,
            "is_premium": user.is_premium
        }), 200

    except Exception as e:
        return jsonify({"error": "Login failed."}), 500

@auth_bp.route('/auth/me', methods=['GET'])
@token_required
def get_me():
    return jsonify({
        "status": "success",
        "data": g.user.to_dict()
    }), 200
