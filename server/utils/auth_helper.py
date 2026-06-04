import jwt
from datetime import datetime, timedelta, timezone
from flask import request, jsonify, current_app, g
from functools import wraps
from models import User

def encode_auth_token(user_id):
    try:
        payload = {
            'exp': datetime.now(timezone.utc) + timedelta(days=7),
            'iat': datetime.now(timezone.utc),
            'sub': user_id
        }
        return jwt.encode(
            payload,
            current_app.config.get('SECRET_KEY', 'dev-secret-key-resumatch-9821'),
            algorithm='HS256'
        )
    except Exception as e:
        return str(e)

def decode_auth_token(auth_token):
    try:
        payload = jwt.decode(
            auth_token,
            current_app.config.get('SECRET_KEY', 'dev-secret-key-resumatch-9821'),
            algorithms=['HS256']
        )
        return payload['sub']
    except jwt.ExpiredSignatureError:
        return 'Signature expired. Please log in again.'
    except jwt.InvalidTokenError:
        return 'Invalid token. Please log in again.'

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        auth_token = None
        if auth_header:
            try:
                # Expecting 'Bearer <token>'
                parts = auth_header.split(" ")
                if len(parts) == 2 and parts[0].lower() == 'bearer':
                    auth_token = parts[1]
            except Exception:
                pass
        
        if not auth_token:
            return jsonify({'error': 'Token is missing.'}), 401
        
        resp = decode_auth_token(auth_token)
        if isinstance(resp, str):
            return jsonify({'error': resp}), 401
        
        # Current user
        # Note: In modern SQLAlchemy Session.get() or Query.get() works
        user = User.query.get(resp)
        if not user:
            return jsonify({'error': 'User not found.'}), 401
            
        g.user = user
        return f(*args, **kwargs)
    return decorated

def get_current_user_optional():
    """Helper to check if a valid user is logged in, but don't error if not."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    try:
        parts = auth_header.split(" ")
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            auth_token = parts[1]
            resp = decode_auth_token(auth_token)
            if not isinstance(resp, str):
                return User.query.get(resp)
    except Exception:
        pass
    return None
