"""
Concertix Load Test — Locust Traffic Generator

Simulates realistic user traffic patterns for monitoring and stress testing.

Usage:
    pip install locust
    locust -f locustfile.py --host=http://localhost:8000

    # Headless mode (for CI):
    locust -f locustfile.py --host=http://localhost:8000 \
        --headless -u 50 -r 10 --run-time 2m
"""

from locust import HttpUser, task, between, SequentialTaskSet
import json
import random


class BrowsingUser(HttpUser):
    """Simulates casual users browsing concerts (unauthenticated)."""

    wait_time = between(1, 5)
    weight = 5  # Most common user type

    @task(5)
    def browse_concerts(self):
        """Browse concert listing — most common action."""
        page = random.randint(1, 3)
        self.client.get(f"/concerts?page={page}&per_page=10", name="/concerts")

    @task(2)
    def view_concert_detail(self):
        """View a specific concert."""
        # Use a placeholder ID; in real test, fetch from listing first
        self.client.get("/concerts/test-id", name="/concerts/[id]")

    @task(1)
    def health_check(self):
        """Hit health endpoint."""
        self.client.get("/")


class AuthenticatedUser(HttpUser):
    """Simulates authenticated users who log in and purchase tickets."""

    wait_time = between(2, 6)
    weight = 2  # Less common than browsers

    def on_start(self):
        """Login on start to get JWT token."""
        response = self.client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "testpass123",
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token", "")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = ""
            self.headers = {}

    @task(3)
    def browse_concerts(self):
        """Browse concerts while logged in."""
        self.client.get("/concerts", headers=self.headers, name="/concerts")

    @task(2)
    def view_my_tickets(self):
        """Check my tickets."""
        self.client.get("/tickets/my-tickets", headers=self.headers, name="/tickets/my-tickets")

    @task(1)
    def order_ticket(self):
        """Try to order a ticket."""
        self.client.post(
            "/tickets/order",
            json={"concert_id": "test-concert-id", "quantity": 1},
            headers=self.headers,
            name="/tickets/order",
        )


class AggressiveUser(HttpUser):
    """Simulates aggressive/malicious traffic for stress testing rate limits."""

    wait_time = between(0.1, 0.5)
    weight = 1  # Rare but intense

    @task(5)
    def rapid_login_attempts(self):
        """Rapid login attempts — should trigger rate limiting (T4)."""
        self.client.post("/auth/login", json={
            "email": f"attacker{random.randint(1,100)}@evil.com",
            "password": "wrongpass",
        }, name="/auth/login [bruteforce]")

    @task(2)
    def rapid_concert_requests(self):
        """Flood concert listing."""
        self.client.get("/concerts", name="/concerts [flood]")

    @task(1)
    def fake_webhook(self):
        """Send fake webhook — should be rejected by signature check (T3)."""
        self.client.post("/payments/webhook", json={
            "order_id": "fake-order",
            "transaction_status": "settlement",
            "payment_type": "credit_card",
            "gross_amount": "100000",
            "signature_key": "invalid-signature",
        }, name="/payments/webhook [fake]")
