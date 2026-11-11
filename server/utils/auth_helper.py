import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Header, HTTPException, Depends, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from models import User
from utils.db import get_db

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-resumatch-9821')
ALGORITHM = 'HS256'

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def encode_auth_token(user_id: str) -> str:
    try:
        payload = {
            'exp': datetime.now(timezone.utc) + timedelta(days=7),
            'iat': datetime.now(timezone.utc),
            'sub': user_id
        }
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    except Exception as e:
        return str(e)

def decode_auth_token(auth_token: str):
    try:
        payload = jwt.decode(auth_token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload['sub']
    except jwt.ExpiredSignatureError:
        return 'Signature expired. Please log in again.'
    except jwt.InvalidTokenError:
        return 'Invalid token. Please log in again.'

def get_token_from_header(authorization: str = Header(None)) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is missing."
        )
    try:
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            return parts[1]
    except Exception:
        pass
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authorization header format. Expected Bearer <token>"
    )

def get_current_user(token: str = Depends(get_token_from_header), db: Session = Depends(get_db)) -> User:
    user_id = decode_auth_token(token)
    if isinstance(user_id, str) and ('expired' in user_id or 'Invalid' in user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=user_id
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )
    return user

def get_current_user_optional(authorization: str = Header(None), db: Session = Depends(get_db)) -> User | None:
    if not authorization:
        return None
    try:
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            token = parts[1]
            user_id = decode_auth_token(token)
            if not isinstance(user_id, str) or ('expired' not in user_id and 'Invalid' not in user_id):
                return db.query(User).filter(User.id == user_id).first()
    except Exception:
        pass
    return None
