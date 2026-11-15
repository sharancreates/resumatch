import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base, User, Organization, Membership, Subscription, Payment, Referral
from routes.billing import (
    STUDENT_PLANS,
    CreateOrderRequest,
    RazorpayVerifyRequest,
    create_billing_order,
    verify_payment,
    mock_upgrade,
    get_student_plans,
    verify_razorpay_signature
)
from routes.referral import (
    generate_unique_referral_code,
    process_referral_reward,
    get_my_referral_info
)
from utils.auth_helper import TenantContext


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_student_plans_catalog():
    """Verify that student plans catalog contains Sprint Pass and Placement Season Pass."""
    assert "sprint_pass" in STUDENT_PLANS
    assert "placement_season" in STUDENT_PLANS

    sprint = STUDENT_PLANS["sprint_pass"]
    assert sprint["price_inr"] == 199
    assert sprint["amount_paise"] == 19900
    assert sprint["duration_days"] == 14

    placement = STUDENT_PLANS["placement_season"]
    assert placement["price_inr"] == 499
    assert placement["amount_paise"] == 49900
    assert placement["duration_days"] == 90


def test_create_billing_order_student_plans():
    """Verify that create_billing_order accepts student plan IDs and returns correct amounts."""
    org = Organization(id="org-test-student", name="Student Org", slug="student-org")
    member = Membership(id="mem-1", organization_id="org-test-student", user_id="usr-1", role="OWNER")
    tenant = TenantContext(organization=org, membership=member)

    # 1. Sprint Pass order
    res_sprint = create_billing_order(req=CreateOrderRequest(plan_id="sprint_pass"), tenant=tenant, db=None)
    assert res_sprint["status"] == "mock"
    assert res_sprint["amount"] == 19900
    assert res_sprint["plan_id"] == "sprint_pass"

    # 2. Placement Season order
    res_placement = create_billing_order(req=CreateOrderRequest(plan_id="placement_season"), tenant=tenant, db=None)
    assert res_placement["status"] == "mock"
    assert res_placement["amount"] == 49900
    assert res_placement["plan_id"] == "placement_season"


def test_mock_upgrade_sprint_pass(db_session):
    """Verify that mock upgrade with sprint_pass sets 14 days duration."""
    org = Organization(id=str(uuid.uuid4()), name="Personal Workspace", slug="personal-org")
    user = User(id=str(uuid.uuid4()), email="student@example.com", password_hash="hash")
    member = Membership(id=str(uuid.uuid4()), organization_id=org.id, user_id=user.id, role="OWNER")
    db_session.add_all([org, user, member])
    db_session.commit()

    tenant = TenantContext(organization=org, membership=member)
    res = mock_upgrade(req=CreateOrderRequest(plan_id="sprint_pass"), tenant=tenant, db=db_session)

    assert res["status"] == "success"
    assert res["subscription"]["plan"] == "SPRINT_PASS"
    assert res["subscription"]["status"] == "active"

    # Verify DB record
    sub = db_session.query(Subscription).filter(Subscription.organization_id == org.id).first()
    assert sub.plan == "SPRINT_PASS"
    now = datetime.now(timezone.utc)
    sub_end = sub.current_period_end
    if sub_end.tzinfo is None:
        sub_end = sub_end.replace(tzinfo=timezone.utc)
    # Expiry should be roughly 14 days in future
    days_diff = (sub_end - now).days
    assert 13 <= days_diff <= 14


def test_mock_upgrade_placement_season(db_session):
    """Verify that mock upgrade with placement_season sets 90 days duration."""
    org = Organization(id=str(uuid.uuid4()), name="Personal Workspace", slug="personal-org-2")
    user = User(id=str(uuid.uuid4()), email="senior@example.com", password_hash="hash")
    member = Membership(id=str(uuid.uuid4()), organization_id=org.id, user_id=user.id, role="OWNER")
    db_session.add_all([org, user, member])
    db_session.commit()

    tenant = TenantContext(organization=org, membership=member)
    res = mock_upgrade(req=CreateOrderRequest(plan_id="placement_season"), tenant=tenant, db=db_session)

    assert res["status"] == "success"
    assert res["subscription"]["plan"] == "PLACEMENT_SEASON"

    sub = db_session.query(Subscription).filter(Subscription.organization_id == org.id).first()
    assert sub.plan == "PLACEMENT_SEASON"
    now = datetime.now(timezone.utc)
    sub_end = sub.current_period_end
    if sub_end.tzinfo is None:
        sub_end = sub_end.replace(tzinfo=timezone.utc)
    days_diff = (sub_end - now).days
    assert 89 <= days_diff <= 90


def test_user_is_premium_property(db_session):
    """Verify User.is_premium evaluates active student passes and expired status correctly."""
    org = Organization(id=str(uuid.uuid4()), name="Personal Workspace", slug="personal-org-prem")
    user = User(id=str(uuid.uuid4()), email="testuser@example.com", password_hash="hash")
    member = Membership(id=str(uuid.uuid4()), organization_id=org.id, user_id=user.id, role="OWNER")
    
    # Active pass (10 days in future)
    future_time = datetime.now(timezone.utc) + timedelta(days=10)
    sub = Subscription(
        id=str(uuid.uuid4()),
        organization_id=org.id,
        plan="SPRINT_PASS",
        status="active",
        current_period_start=datetime.now(timezone.utc),
        current_period_end=future_time
    )
    db_session.add_all([org, user, member, sub])
    db_session.commit()
    db_session.refresh(user)

    assert user.is_premium is True

    # Expired pass (yesterday)
    past_time = datetime.now(timezone.utc) - timedelta(days=1)
    sub.current_period_end = past_time
    db_session.commit()
    db_session.refresh(user)

    assert user.is_premium is False


def test_referral_reward_unlock_at_three_friends(db_session):
    """Verify that when 3 friends join via a user's referral code, the referrer unlocks 7 days free Sprint Pass."""
    # 1. Create Referrer
    referrer_org = Organization(id=str(uuid.uuid4()), name="Referrer Org", slug="referrer-org")
    referrer = User(
        id=str(uuid.uuid4()),
        email="referrer@example.com",
        password_hash="hash",
        referral_code="AARAV26"
    )
    referrer_member = Membership(
        id=str(uuid.uuid4()),
        organization_id=referrer_org.id,
        user_id=referrer.id,
        role="OWNER"
    )
    referrer_sub = Subscription(
        id=str(uuid.uuid4()),
        organization_id=referrer_org.id,
        plan="FREE",
        status="active",
        current_period_start=datetime.now(timezone.utc),
        current_period_end=datetime.now(timezone.utc)
    )
    db_session.add_all([referrer_org, referrer, referrer_member, referrer_sub])
    db_session.commit()

    # User starts as not premium
    assert referrer.is_premium is False

    # 2. Friend 1 joins
    friend1 = User(id=str(uuid.uuid4()), email="friend1@example.com", password_hash="hash")
    ref1 = Referral(id=str(uuid.uuid4()), referrer_user_id=referrer.id, referred_user_id=friend1.id)
    db_session.add_all([friend1, ref1])
    db_session.commit()
    assert process_referral_reward(referrer.id, db_session) is False

    # 3. Friend 2 joins
    friend2 = User(id=str(uuid.uuid4()), email="friend2@example.com", password_hash="hash")
    ref2 = Referral(id=str(uuid.uuid4()), referrer_user_id=referrer.id, referred_user_id=friend2.id)
    db_session.add_all([friend2, ref2])
    db_session.commit()
    assert process_referral_reward(referrer.id, db_session) is False

    # 4. Friend 3 joins -> Milestone reached!
    friend3 = User(id=str(uuid.uuid4()), email="friend3@example.com", password_hash="hash")
    ref3 = Referral(id=str(uuid.uuid4()), referrer_user_id=referrer.id, referred_user_id=friend3.id)
    db_session.add_all([friend3, ref3])
    db_session.commit()
    
    # Trigger reward check
    reward_granted = process_referral_reward(referrer.id, db_session)
    assert reward_granted is True

    # Referrer's subscription should now be SPRINT_PASS and active
    db_session.refresh(referrer_sub)
    assert referrer_sub.plan == "SPRINT_PASS"
    assert referrer_sub.status == "active"
    db_session.refresh(referrer)
    assert referrer.is_premium is True

    # Verify referrals marked rewarded
    unrewarded_count = db_session.query(Referral).filter(
        Referral.referrer_user_id == referrer.id,
        Referral.reward_granted == False
    ).count()
    assert unrewarded_count == 0


def test_get_my_referral_info_endpoint(db_session):
    """Verify GET /api/referrals/me endpoint returns proper stats and share link."""
    user = User(
        id=str(uuid.uuid4()),
        email="student_hub@example.com",
        password_hash="hash",
        referral_code="HUB2026"
    )
    db_session.add(user)
    db_session.commit()

    info = get_my_referral_info(user=user, db=db_session)
    assert info["status"] == "success"
    assert info["referral_code"] == "HUB2026"
    assert "?ref=HUB2026" in info["share_url"]
    assert info["total_referrals"] == 0
    assert info["friends_needed_for_next"] == 3
    assert info["days_earned"] == 0
