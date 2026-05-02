import httpx

from app.config import get_settings
from app.services import email_service


class _FakeResendResponse:
    def raise_for_status(self):
        return None


class _FakeResendClient:
    def __init__(self, captured, *args, **kwargs):
        self.captured = captured

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def post(self, url, headers, json):
        self.captured["url"] = url
        self.captured["headers"] = headers
        self.captured["json"] = json
        return _FakeResendResponse()


def test_send_password_reset_otp_uses_brevo_when_configured(monkeypatch):
    captured = {}
    monkeypatch.setenv("BREVO_API_KEY", "xkeysib-test")
    monkeypatch.setenv("BREVO_FROM_EMAIL", "sender@gmail.com")
    monkeypatch.setenv("BREVO_FROM_NAME", "Concertix")
    monkeypatch.setenv("RESEND_API_KEY", "")
    monkeypatch.setenv("SMTP_HOST", "")
    monkeypatch.setattr(
        email_service.httpx,
        "Client",
        lambda *args, **kwargs: _FakeResendClient(captured, *args, **kwargs),
    )
    get_settings.cache_clear()

    try:
        assert email_service.send_password_reset_otp("user@example.com", "123456") is True
    finally:
        get_settings.cache_clear()

    assert captured["url"] == email_service.BREVO_EMAILS_URL
    assert captured["headers"]["api-key"] == "xkeysib-test"
    assert captured["json"]["sender"] == {
        "name": "Concertix",
        "email": "sender@gmail.com",
    }
    assert captured["json"]["to"] == [{"email": "user@example.com"}]
    assert "123456" in captured["json"]["textContent"]


def test_send_password_reset_otp_brevo_failure_returns_false(monkeypatch):
    class FailingClient(_FakeResendClient):
        def post(self, url, headers, json):
            raise httpx.ConnectError("network blocked")

    monkeypatch.setenv("BREVO_API_KEY", "xkeysib-test")
    monkeypatch.setenv("BREVO_FROM_EMAIL", "sender@gmail.com")
    monkeypatch.setattr(
        email_service.httpx,
        "Client",
        lambda *args, **kwargs: FailingClient({}, *args, **kwargs),
    )
    get_settings.cache_clear()

    try:
        assert email_service.send_password_reset_otp("user@example.com", "123456") is False
    finally:
        get_settings.cache_clear()


def test_send_password_reset_otp_uses_resend_when_configured(monkeypatch):
    captured = {}
    monkeypatch.setenv("BREVO_API_KEY", "")
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "Concertix <noreply@example.com>")
    monkeypatch.setenv("SMTP_HOST", "")
    monkeypatch.setattr(
        email_service.httpx,
        "Client",
        lambda *args, **kwargs: _FakeResendClient(captured, *args, **kwargs),
    )
    get_settings.cache_clear()

    try:
        assert email_service.send_password_reset_otp("user@example.com", "123456") is True
    finally:
        get_settings.cache_clear()

    assert captured["url"] == email_service.RESEND_EMAILS_URL
    assert captured["headers"]["Authorization"] == "Bearer re_test_key"
    assert captured["json"]["from"] == "Concertix <noreply@example.com>"
    assert captured["json"]["to"] == ["user@example.com"]
    assert "123456" in captured["json"]["text"]


def test_send_password_reset_otp_resend_failure_returns_false(monkeypatch):
    class FailingClient(_FakeResendClient):
        def post(self, url, headers, json):
            raise httpx.ConnectError("network blocked")

    monkeypatch.setenv("BREVO_API_KEY", "")
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "Concertix <noreply@example.com>")
    monkeypatch.setattr(
        email_service.httpx,
        "Client",
        lambda *args, **kwargs: FailingClient({}, *args, **kwargs),
    )
    get_settings.cache_clear()

    try:
        assert email_service.send_password_reset_otp("user@example.com", "123456") is False
    finally:
        get_settings.cache_clear()
