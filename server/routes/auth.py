import re
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from models import User, Organization, Membership, Subscription
from utils.db import get_db
from utils.auth_helper import (
    hash_password, 
    verify_password, 
    encode_auth_token, 
    get_current_user
)

auth_router = APIRouter(prefix="/api", tags=["authentication"])

EMAIL_REGEX = r'^[\w\.-]+@[\w\.-]+\.\w+$'

class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    linkedin_url: str | None = None
    industry: str | None = None
    job_title: str | None = None

@auth_router.post('/auth/register', status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    password = req.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    if not re.match(EMAIL_REGEX, email):
        raise HTTPException(status_code=400, detail="Invalid email address format.")

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    try:
        # Create User
        user_id = str(uuid.uuid4())
        hashed_pwd = hash_password(password)
        new_user = User(
            id=user_id, 
            email=email, 
            password_hash=hashed_pwd,
            email_verified=True # Auto verify for simplicity
        )
        db.add(new_user)
        
        # Create Default Personal Organization
        org_id = str(uuid.uuid4())
        org_slug = f"personal-{email.split('@')[0]}-{str(uuid.uuid4())[:6]}"
        personal_org = Organization(
            id=org_id,
            name=f"Personal Workspace ({email})",
            slug=org_slug
        )
        db.add(personal_org)

        # Create Membership linking User as OWNER of the Organization
        membership = Membership(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            user_id=user_id,
            role="OWNER"
        )
        db.add(membership)

        # Create subscription row (Free tier)
        subscription = Subscription(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            stripe_customer_id=f"cus_mock_{str(uuid.uuid4())[:8]}",
            plan="FREE",
            status="active",
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc)
        )
        db.add(subscription)

        db.commit()

        # Generate JWT token
        token = encode_auth_token(new_user.id)
        
        return {
            "status": "success",
            "message": "User registered successfully.",
            "token": token,
            "email": new_user.email,
            "is_premium": False
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@auth_router.post('/auth/login')
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    password = req.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    # Find user
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Generate token
    token = encode_auth_token(user.id)
    
    return {
        "status": "success",
        "token": token,
        "email": user.email,
        "is_premium": user.is_premium
    }

@auth_router.get('/auth/me')
def get_me(user: User = Depends(get_current_user)):
    return {
        "status": "success",
        "data": user.to_dict()
    }

@auth_router.put('/user/profile')
def update_profile(req: ProfileUpdateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        if req.name is not None:
            user.name = req.name
        if req.linkedin_url is not None:
            user.linkedin_url = req.linkedin_url
        if req.industry is not None:
            user.industry = req.industry
        if req.job_title is not None:
            user.job_title = req.job_title
        
        db.commit()
        return {
            "status": "success",
            "message": "Profile updated successfully.",
            "data": user.to_dict()
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")
