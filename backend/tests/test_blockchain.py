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

    def test_blockchain_verify(self):
        """GET /blockchain/verify should return chain integrity check."""
        response = client.get("/blockchain/verify")
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert "total_blocks" in data
        assert "errors" in data
        assert isinstance(data["errors"], list)

    def test_blockchain_chain(self):
        """GET /blockchain/chain should return blocks list."""
        response = client.get("/blockchain/chain")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_ticket_not_on_blockchain(self):
        """GET /blockchain/ticket/{id} for non-existent ticket."""
        response = client.get("/blockchain/ticket/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 200
        data = response.json()
        assert data["is_on_blockchain"] is False
