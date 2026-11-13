import os
import hmac
import hashlib
import pytest
from fastapi import HTTPException
from routes.billing import (
    verify_razorpay_signature,
    verify_webhook_signature,
    mock_upgrade,
    create_billing_order,
    PRO_PRICE_INR_PAISE
)
from utils.auth_helper import validate_secret_key, TenantContext
from models import Organization, Membership


def test_razorpay_payment_signature_verification():
    """Verify that HMAC SHA-256 signatures are correctly validated and tampered ones rejected."""
    secret = "rzp_test_secret_key_12345"
    order_id = "order_N0abcdef123456"
    payment_id = "pay_N0abcdef789012"

    msg = f"{order_id}|{payment_id}".encode("utf-8")
    valid_signature = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    # Valid signature
    assert verify_razorpay_signature(order_id, payment_id, valid_signature, secret) is True

    # Tampered signature
    assert verify_razorpay_signature(order_id, payment_id, "tampered_signature_xyz", secret) is False

    # Tampered order_id
    assert verify_razorpay_signature("tampered_order_id", payment_id, valid_signature, secret) is False

    # Empty inputs
    assert verify_razorpay_signature("", payment_id, valid_signature, secret) is False
    assert verify_razorpay_signature(order_id, payment_id, valid_signature, "") is False


def test_razorpay_webhook_signature_verification():
    """Verify that webhook payload signatures are checked against RAZORPAY_WEBHOOK_SECRET."""
    secret = "whsec_super_secret_webhook_key"
    payload = b'{"event":"order.paid","payload":{"order":{"entity":{"id":"order_123"}}}}'

    valid_sig = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

    # Valid webhook signature
    assert verify_webhook_signature(payload, valid_sig, secret) is True

    # Tampered payload
    tampered_payload = b'{"event":"order.paid","payload":{"order":{"entity":{"id":"order_999"}}}}'
    assert verify_webhook_signature(tampered_payload, valid_sig, secret) is False

    # Tampered signature
    assert verify_webhook_signature(payload, "invalid_sig", secret) is False


def test_mock_upgrade_production_guardrail(monkeypatch):
    """Verify that mock_upgrade is hard-blocked with 403 Forbidden in production environments."""
    monkeypatch.setenv("ENVIRONMENT", "production")

    mock_org = Organization(id="org-test-1", name="Test Org", slug="test-org")
    mock_member = Membership(id="mem-1", organization_id="org-test-1", user_id="usr-1", role="OWNER")
    tenant = TenantContext(organization=mock_org, membership=mock_member)

    with pytest.raises(HTTPException) as exc_info:
        mock_upgrade(tenant=tenant, db=None)

    assert exc_info.value.status_code == 403
    assert "Mock upgrades are disabled in production" in exc_info.value.detail


def test_production_secret_key_guardrail(monkeypatch):
    """Verify that default JWT secret triggers RuntimeError when ENVIRONMENT is production."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", "dev-secret-key-resumatch-9821")

    with pytest.raises(RuntimeError) as exc_info:
        validate_secret_key()

    assert "Critical Security Error" in str(exc_info.value)
    assert "Production environment requires an explicitly set SECRET_KEY" in str(exc_info.value)

    # When explicit production secret is set, it passes
    monkeypatch.setenv("SECRET_KEY", "prod-super-secure-key-abc987654321")
    assert validate_secret_key() == "prod-super-secure-key-abc987654321"


def test_billing_order_rbac_guard():
    """Verify that only organization OWNER or ADMIN can initiate billing orders."""
    mock_org = Organization(id="org-test-2", name="Viewer Org", slug="viewer-org")

    # VIEWER role should be rejected with 403
    viewer_member = Membership(id="mem-2", organization_id="org-test-2", user_id="usr-2", role="VIEWER")
    tenant_viewer = TenantContext(organization=mock_org, membership=viewer_member)

    with pytest.raises(HTTPException) as exc_info:
        create_billing_order(tenant=tenant_viewer, db=None)

    assert exc_info.value.status_code == 403
    assert "Only organization owners and admins can initiate billing orders" in exc_info.value.detail

    # ADMIN role passes RBAC check (returns mock since keys unset)
    admin_member = Membership(id="mem-3", organization_id="org-test-2", user_id="usr-3", role="ADMIN")
    tenant_admin = TenantContext(organization=mock_org, membership=admin_member)

    res = create_billing_order(tenant=tenant_admin, db=None)
    assert res["status"] == "mock"
    assert res["amount"] == PRO_PRICE_INR_PAISE
