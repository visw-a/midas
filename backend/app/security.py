"""Simple shared-password session auth (no user accounts).

A correct password gets a signed, expiring cookie (itsdangerous), which is
enough to gate a small internal dashboard without standing up a user table.
"""

from __future__ import annotations

from fastapi import Cookie, HTTPException, Request, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import get_settings

settings = get_settings()
_serializer = URLSafeTimedSerializer(settings.secret_key, salt="midas-session")

SESSION_VALUE = "authenticated"


def create_session_token() -> str:
    return _serializer.dumps(SESSION_VALUE)


def verify_session_token(token: str) -> bool:
    try:
        value = _serializer.loads(token, max_age=settings.session_max_age_seconds)
    except (BadSignature, SignatureExpired):
        return False
    return value == SESSION_VALUE


def require_auth(
    request: Request,
    session_token: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> None:
    token = session_token or request.cookies.get(settings.session_cookie_name)
    if not token or not verify_session_token(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
