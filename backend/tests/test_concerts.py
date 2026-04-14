"""
Unit Tests for Concert Endpoints — /concerts
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestConcerts:
    """Tests for GET /concerts"""

    def test_list_concerts(self):
        """GET /concerts should return 200 with a list."""
        response = client.get("/concerts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_health_check(self):
        """GET / should return app status."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert "version" in data
