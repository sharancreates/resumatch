import os
import jwt
from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from fastapi import Header, HTTPException, Depends, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from models import User, Organization, Membership
from utils.db import get_db

@dataclass
class TenantContext:
    organization: Optional[Organization]
    membership: Optional[Membership]

    @property
    def organization_id(self) -> Optional[str]:
        return self.organization.id if self.organization else None

    @property
    def role(self) -> Optional[str]:
        return self.membership.role if self.membership else None

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

def get_current_organization(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-Id"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> TenantContext:
    if x_organization_id:
        membership = db.query(Membership).filter(
            Membership.user_id == user.id,
            Membership.organization_id == x_organization_id
        ).first()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this organization"
            )
        org = db.query(Organization).filter(Organization.id == x_organization_id).first()
        return TenantContext(organization=org, membership=membership)

    # If X-Organization-Id is omitted, check user's default/first membership
    membership = db.query(Membership).filter(Membership.user_id == user.id).first()
    if membership:
        org = db.query(Organization).filter(Organization.id == membership.organization_id).first()
        return TenantContext(organization=org, membership=membership)

    return TenantContext(organization=None, membership=None)

def get_tenant_context_optional(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-Id"),
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> TenantContext:
    if not user:
        return TenantContext(organization=None, membership=None)
    if x_organization_id:
        membership = db.query(Membership).filter(
            Membership.user_id == user.id,
            Membership.organization_id == x_organization_id
        ).first()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this organization"
            )
        org = db.query(Organization).filter(Organization.id == x_organization_id).first()
        return TenantContext(organization=org, membership=membership)
    membership = db.query(Membership).filter(Membership.user_id == user.id).first()
    if membership:
        org = db.query(Organization).filter(Organization.id == membership.organization_id).first()
        return TenantContext(organization=org, membership=membership)
    return TenantContext(organization=None, membership=None)

def require_role(allowed_roles: List[str]):
    def role_checker(
        tenant: TenantContext = Depends(get_current_organization)
    ) -> TenantContext:
        if not tenant.membership or tenant.membership.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of the following roles: {', '.join(allowed_roles)}"
            )
        return tenant
    return role_checker
