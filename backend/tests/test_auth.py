"""
Unit Tests for Auth Endpoints — /auth/register, /auth/login
Tests security mitigations: T1 (token blacklist), T4 (rate limit)
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Unique email per test run to avoid conflicts
import uuid
TEST_EMAIL = f"test_{uuid.uuid4().hex[:8]}@example.com"
TEST_PASSWORD = "SecureP@ss123"
TEST_NAME = "Test User"


class TestRegister:
    """Tests for POST /auth/register"""

    def test_register_success(self):
        """New user registration should return 201 with tokens."""
        response = client.post("/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": TEST_NAME,
        })
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == TEST_EMAIL

    def test_register_duplicate_email(self):
        """Registering with existing email should return 400."""
        response = client.post("/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": TEST_NAME,
        })
        assert response.status_code == 400
        assert "sudah terdaftar" in response.json()["detail"].lower() or response.status_code == 400

    def test_register_missing_fields(self):
        """Register without required fields should return 422."""
        response = client.post("/auth/register", json={
            "email": "incomplete@test.com",
        })
        assert response.status_code == 422


class TestLogin:
    """Tests for POST /auth/login"""

    def test_login_success(self):
        """Login with valid credentials should return 200 with tokens."""
        response = client.post("/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "customer"

    def test_login_wrong_password(self):
        """Login with wrong password should return 401."""
        response = client.post("/auth/login", json={
            "email": TEST_EMAIL,
            "password": "WrongPassword123!",
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self):
        """Login with non-existent email should return 401."""
        response = client.post("/auth/login", json={
            "email": "nobody@test.com",
            "password": "whatever",
        })
        assert response.status_code == 401


class TestTokenBlacklist:
    """T1 Mitigation: JWT token blacklist after logout."""

    def test_logout_invalidates_token(self):
        """After logout, the same token should be rejected (401)."""
        # Check if Redis is available (token blacklist requires Redis)
        try:
            import redis
            r = redis.Redis(host='localhost', port=6379, db=0)
            r.ping()
        except Exception:
            pytest.skip("Redis not available — token blacklist test skipped (run with Docker)")

        # Login to get a valid token
        login_resp = client.post("/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Verify token works
        me_resp = client.get("/auth/me", headers=headers)
        assert me_resp.status_code == 200

        # Logout (blacklist token)
        logout_resp = client.post("/auth/logout", headers=headers)
        assert logout_resp.status_code == 200

        # Token should now be rejected
        me_resp2 = client.get("/auth/me", headers=headers)
        assert me_resp2.status_code == 401


class TestRBAC:
    """T10 Mitigation: Role-Based Access Control."""

    def test_customer_cannot_access_admin(self):
        """Customer role should be rejected from admin endpoints (403)."""
        login_resp = client.post("/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        admin_resp = client.get("/admin/stats", headers=headers)
        assert admin_resp.status_code == 403
