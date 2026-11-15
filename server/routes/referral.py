import os
import uuid
import secrets
import string
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models import User, Referral, Membership, Subscription, AuditLog
from utils.db import get_db
from utils.auth_helper import get_current_user

logger = logging.getLogger(__name__)

referral_router = APIRouter(prefix="/api/referrals", tags=["referrals"])


def generate_unique_referral_code(db: Session, length: int = 7) -> str:
    """Generates an uppercase alphanumeric referral code unique in users table."""
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(20):
        code = ''.join(secrets.choice(alphabet) for _ in range(length))
        existing = db.query(User).filter(User.referral_code == code).first()
        if not existing:
            return code
    return f"REF{secrets.token_hex(3).upper()}"


def process_referral_reward(referrer_id: str, db: Session) -> bool:
    """
    Checks if referrer has accumulated 3 unrewarded referrals.
    If so, grants 7 days of free Sprint Pass access.
    """
    try:
        unrewarded = db.query(Referral).filter(
            Referral.referrer_user_id == referrer_id,
            Referral.reward_granted == False
        ).order_by(Referral.created_at.asc()).all()

        rewarded_any = False
        while len(unrewarded) >= 3:
            batch = unrewarded[:3]
            for ref_record in batch:
                ref_record.reward_granted = True
                ref_record.status = "rewarded"
            unrewarded = unrewarded[3:]

            membership = db.query(Membership).filter(Membership.user_id == referrer_id).first()
            if membership:
                sub = db.query(Subscription).filter(
                    Subscription.organization_id == membership.organization_id
                ).first()
                now = datetime.now(timezone.utc)

                if sub:
                    if sub.status == 'active' and sub.current_period_end:
                        sub_end = sub.current_period_end
                        if sub_end.tzinfo is None:
                            sub_end = sub_end.replace(tzinfo=timezone.utc)
                        if sub_end > now:
                            sub.current_period_end = sub_end + timedelta(days=7)
                        else:
                            sub.plan = "SPRINT_PASS"
                            sub.status = "active"
                            sub.current_period_start = now
                            sub.current_period_end = now + timedelta(days=7)
                    else:
                        sub.plan = "SPRINT_PASS"
                        sub.status = "active"
                        sub.current_period_start = now
                        sub.current_period_end = now + timedelta(days=7)
                else:
                    sub = Subscription(
                        id=str(uuid.uuid4()),
                        organization_id=membership.organization_id,
                        payment_provider="REFERRAL_REWARD",
                        plan="SPRINT_PASS",
                        status="active",
                        current_period_start=now,
                        current_period_end=now + timedelta(days=7)
                    )
                    db.add(sub)

                audit = AuditLog(
                    id=str(uuid.uuid4()),
                    organization_id=membership.organization_id,
                    actor_id=referrer_id,
                    action="REFERRAL_REWARD_GRANTED",
                    target_type="SUBSCRIPTION",
                    target_id=sub.id if sub else None,
                    created_at=now
                )
                db.add(audit)
                rewarded_any = True

        if rewarded_any:
            db.commit()
            logger.info(f"Referral reward (7 days Sprint Pass) granted to user {referrer_id}")
            return True
        return False
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing referral reward for {referrer_id}: {str(e)}")
        return False


@referral_router.get('/me')
def get_my_referral_info(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns user's referral code, shareable link, friends invited count, and progress towards rewards.
    """
    # Ensure user has a referral code
    if not user.referral_code:
        user.referral_code = generate_unique_referral_code(db)
        db.commit()
        db.refresh(user)

    referrals = db.query(Referral).filter(Referral.referrer_user_id == user.id).all()
    total_referrals = len(referrals)
    rewarded = [r for r in referrals if r.reward_granted]
    pending_towards_next = len([r for r in referrals if not r.reward_granted])
    days_earned = (len(rewarded) // 3) * 7

    client_url = os.environ.get("CLIENT_URL", "http://localhost:5173")
    share_url = f"{client_url}/?ref={user.referral_code}"

    return {
        "status": "success",
        "referral_code": user.referral_code,
        "share_url": share_url,
        "total_referrals": total_referrals,
        "pending_towards_next": pending_towards_next,
        "friends_needed_for_next": max(0, 3 - pending_towards_next),
        "days_earned": days_earned,
        "reward_rule": "Invite 3 friends to get 7 days of free Sprint Pass!"
    }
