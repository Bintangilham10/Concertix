"""
Unit Tests for Blockchain Endpoints — /blockchain
Verifies Week 3 blockchain ticketing implementation.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestBlockchain:
    """Tests for blockchain verification endpoints."""

    def test_blockchain_info(self):
        """GET /blockchain/info should return chain status."""
        response = client.get("/blockchain/info")
        assert response.status_code == 200
        data = response.json()
        assert "total_blocks" in data
        assert "chain_valid" in data
        assert isinstance(data["chain_valid"], bool)

    def test_blockchain_verify_requires_auth(self):
        """GET /blockchain/verify should require authentication."""
        response = client.get("/blockchain/verify")
        assert response.status_code == 403

    def test_blockchain_chain_requires_auth(self):
        """GET /blockchain/chain should require authentication."""
        response = client.get("/blockchain/chain")
        assert response.status_code == 403

    def test_ticket_blockchain_status_requires_auth(self):
        """GET /blockchain/ticket/{id} should require authentication."""
        response = client.get("/blockchain/ticket/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 403
