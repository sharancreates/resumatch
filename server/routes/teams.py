import uuid
import secrets
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models import User, Organization, Membership, ApiKey, Subscription, AuditLog
from utils.db import get_db
from utils.auth_helper import get_current_user

teams_router = APIRouter(prefix="/api", tags=["teams-and-keys"])

class CreateOrgRequest(BaseModel):
    name: str

class InviteMemberRequest(BaseModel):
    email: str
    role: str # OWNER, ADMIN, RECRUITER, VIEWER

class CreateApiKeyRequest(BaseModel):
    name: str

# --- Organization Endpoints ---

@teams_router.get('/orgs')
def get_user_organizations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        memberships = db.query(Membership).filter(Membership.user_id == user.id).all()
        orgs_list = []
        for m in memberships:
            org = m.organization
            sub = db.query(Subscription).filter(Subscription.organization_id == org.id).first()
            orgs_list.append({
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "role": m.role,
                "plan": sub.plan if sub else "FREE",
                "subscription_status": sub.status if sub else "inactive"
            })
        return {"status": "success", "data": orgs_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@teams_router.post('/orgs')
def create_organization(req: CreateOrgRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Organization name is required.")
        
    try:
        org_id = str(uuid.uuid4())
        org_slug = f"{req.name.lower().replace(' ', '-')}-{str(uuid.uuid4())[:6]}"
        
        new_org = Organization(
            id=org_id,
            name=req.name.strip(),
            slug=org_slug
        )
        db.add(new_org)
        
        membership = Membership(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            user_id=user.id,
            role="OWNER"
        )
        db.add(membership)
        
        subscription = Subscription(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            payment_provider="RAZORPAY",
            plan="FREE",
            status="active",
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc)
        )
        db.add(subscription)
        
        db.commit()
        return {
            "status": "success",
            "message": "Organization created successfully.",
            "data": {
                "id": org_id,
                "name": new_org.name,
                "slug": org_slug,
                "role": "OWNER"
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@teams_router.get('/orgs/{org_id}/members')
def get_org_members(org_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if user is a member of this organization
    membership = db.query(Membership).filter(Membership.organization_id == org_id, Membership.user_id == user.id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden. You do not belong to this organization.")

    memberships = db.query(Membership).filter(Membership.organization_id == org_id).all()
    members_list = []
    for m in memberships:
        u = m.user
        members_list.append({
            "id": m.id,
            "user_id": u.id,
            "email": u.email,
            "name": u.name or u.email.split('@')[0],
            "role": m.role,
            "joined_at": m.created_at.isoformat() if m.created_at else None
        })
    return {"status": "success", "data": members_list}

@teams_router.post('/orgs/{org_id}/members')
def invite_member(org_id: str, req: InviteMemberRequest, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if user is OWNER or ADMIN of this organization
    membership = db.query(Membership).filter(
        Membership.organization_id == org_id, 
        Membership.user_id == user.id,
        Membership.role.in_(["OWNER", "ADMIN"])
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden. Only owners or administrators can invite members.")

    invite_email = req.email.strip().lower()
    if not invite_email:
        raise HTTPException(status_code=400, detail="Invited member email is required.")

    # Find if invited user exists. If not, auto-create a mock user account for login
    invited_user = db.query(User).filter(User.email == invite_email).first()
    if not invited_user:
        # Create a mock placeholder user so they can join later
        invited_user = User(
            id=str(uuid.uuid4()),
            email=invite_email,
            password_hash=None, # Incomplete sign-up placeholder
            email_verified=False
        )
        db.add(invited_user)
        db.flush()

    # Check if already a member
    existing_membership = db.query(Membership).filter(
        Membership.organization_id == org_id, 
        Membership.user_id == invited_user.id
    ).first()
    if existing_membership:
        raise HTTPException(status_code=400, detail="User is already a member of this organization.")

    try:
        new_membership = Membership(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            user_id=invited_user.id,
            role=req.role
        )
        db.add(new_membership)

        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            actor_id=user.id,
            action="INVITE_MEMBER",
            target_type="MEMBERSHIP",
            target_id=new_membership.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent", "")[:256]
        )
        db.add(audit_log)

        db.commit()
        return {
            "status": "success",
            "message": f"Successfully invited {invite_email} to organization.",
            "data": {
                "id": new_membership.id,
                "email": invite_email,
                "role": req.role
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@teams_router.delete('/orgs/{org_id}/members/{membership_id}')
def remove_member(org_id: str, membership_id: str, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if user is OWNER or ADMIN
    actor_membership = db.query(Membership).filter(
        Membership.organization_id == org_id, 
        Membership.user_id == user.id,
        Membership.role.in_(["OWNER", "ADMIN"])
    ).first()
    if not actor_membership:
        raise HTTPException(status_code=403, detail="Forbidden. Only owners or administrators can remove members.")

    target_membership = db.query(Membership).filter(
        Membership.id == membership_id, 
        Membership.organization_id == org_id
    ).first()
    if not target_membership:
        raise HTTPException(status_code=404, detail="Membership record not found.")

    if target_membership.user_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself from the organization.")

    if target_membership.role == "OWNER" and actor_membership.role != "OWNER":
        raise HTTPException(status_code=403, detail="Forbidden. Admins cannot remove organization owners.")

    try:
        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            actor_id=user.id,
            action="REMOVE_MEMBER",
            target_type="MEMBERSHIP",
            target_id=target_membership.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent", "")[:256]
        )
        db.add(audit_log)

        db.delete(target_membership)
        db.commit()
        return {
            "status": "success",
            "message": "Member removed successfully."
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- API Keys Endpoints ---

@teams_router.get('/apikeys')
def get_user_apikeys(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        keys = db.query(ApiKey).filter(ApiKey.user_id == user.id).all()
        keys_list = []
        for k in keys:
            keys_list.append({
                "id": k.id,
                "name": k.name,
                "prefix": k.key_prefix,
                "rate_limit": k.rate_limit,
                "created_at": k.created_at.isoformat() if k.created_at else None,
                "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None
            })
        return {"status": "success", "data": keys_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@teams_router.post('/apikeys')
def create_apikey(
    req: CreateApiKeyRequest,
    request: Request,
    x_organization_id: str | None = Header(None, alias="X-Organization-Id"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Key name is required.")

    # Premium check to limit API keys creation
    if not user.is_premium:
        # Check if they already have keys
        existing_keys = db.query(ApiKey).filter(ApiKey.user_id == user.id).count()
        if existing_keys >= 1:
            raise HTTPException(status_code=403, detail="Free tier limit reached. Upgrade to Premium to generate more developer keys.")

    try:
        raw_key = "rm_" + secrets.token_urlsafe(32)
        key_prefix = raw_key[:12]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        
        new_key = ApiKey(
            id=str(uuid.uuid4()),
            user_id=user.id,
            key_prefix=key_prefix,
            key_hash=key_hash,
            name=req.name.strip(),
            rate_limit=1000 if user.is_premium else 100,
            scopes=["read", "write"]
        )
        db.add(new_key)

        # Audit log if organization context exists
        target_org_id = None
        if x_organization_id:
            mem = db.query(Membership).filter(Membership.user_id == user.id, Membership.organization_id == x_organization_id).first()
            if mem:
                target_org_id = mem.organization_id
        if not target_org_id:
            mem = db.query(Membership).filter(Membership.user_id == user.id).first()
            if mem:
                target_org_id = mem.organization_id

        if target_org_id:
            audit_log = AuditLog(
                id=str(uuid.uuid4()),
                organization_id=target_org_id,
                actor_id=user.id,
                action="CREATE_API_KEY",
                target_type="API_KEY",
                target_id=new_key.id,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent", "")[:256]
            )
            db.add(audit_log)

        db.commit()
        
        return {
            "status": "success",
            "message": "API key generated successfully.",
            "data": {
                "id": new_key.id,
                "name": new_key.name,
                "prefix": key_prefix,
                "raw_key": raw_key # Returned once to user
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@teams_router.delete('/apikeys/{key_id}')
def revoke_apikey(
    key_id: str,
    request: Request,
    x_organization_id: str | None = Header(None, alias="X-Organization-Id"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    key = db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.user_id == user.id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found.")
        
    try:
        target_org_id = None
        if x_organization_id:
            mem = db.query(Membership).filter(Membership.user_id == user.id, Membership.organization_id == x_organization_id).first()
            if mem:
                target_org_id = mem.organization_id
        if not target_org_id:
            mem = db.query(Membership).filter(Membership.user_id == user.id).first()
            if mem:
                target_org_id = mem.organization_id

        if target_org_id:
            audit_log = AuditLog(
                id=str(uuid.uuid4()),
                organization_id=target_org_id,
                actor_id=user.id,
                action="REVOKE_API_KEY",
                target_type="API_KEY",
                target_id=key.id,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent", "")[:256]
            )
            db.add(audit_log)

        db.delete(key)
        db.commit()
        return {
            "status": "success",
            "message": "API key revoked successfully."
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@teams_router.get('/orgs/{org_id}/audit-logs')
def get_org_audit_logs(
    org_id: str,
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    membership = db.query(Membership).filter(
        Membership.organization_id == org_id,
        Membership.user_id == user.id,
        Membership.role.in_(["OWNER", "ADMIN"])
    ).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Only organization owners or administrators can view audit logs."
        )

    query = db.query(AuditLog).filter(AuditLog.organization_id == org_id).order_by(AuditLog.created_at.desc())
    total = query.count()
    logs = query.offset(offset).limit(min(limit, 100)).all()

    return {
        "status": "success",
        "data": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "logs": [
                {
                    "id": log.id,
                    "organization_id": log.organization_id,
                    "actor_id": log.actor_id,
                    "action": log.action,
                    "target_type": log.target_type,
                    "target_id": log.target_id,
                    "ip_address": log.ip_address,
                    "user_agent": log.user_agent,
                    "created_at": log.created_at.isoformat() if log.created_at else None
                }
                for log in logs
            ]
        }
    }
