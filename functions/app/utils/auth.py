"""Firebase Auth ID token verification utility.

Always derives authoritative `uid` from the verified Firebase JWT — never trust
a client-supplied `userId` for authorization.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from firebase_admin import auth as firebase_auth

from app.repositories.base_repo import ensure_firebase_app
from app.utils.errors import AuthenticationError


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    """Verified Firebase Auth identity."""

    uid: str
    email: str | None = None


def extract_bearer_token(authorization_header: str | None) -> str:
    """Extract raw JWT from an Authorization: Bearer <token> header."""
    if not authorization_header:
        raise AuthenticationError("Missing Authorization header.")
    parts = authorization_header.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise AuthenticationError("Authorization header must use Bearer token format.")
    return parts[1].strip()


def verify_request_user(req: Any) -> AuthenticatedUser:
    """Verify Firebase Auth ID token on an incoming Cloud Function request."""
    token = extract_bearer_token(req.headers.get("Authorization"))
    ensure_firebase_app()
    try:
        decoded = firebase_auth.verify_id_token(token, check_revoked=False)
    except Exception as exc:  # noqa: BLE001 - Firebase SDK raises multiple token exception types
        raise AuthenticationError("Invalid or expired authentication token.") from exc

    uid = decoded.get("uid")
    if not isinstance(uid, str) or not uid:
        raise AuthenticationError("Verified token missing subject UID.")
    return AuthenticatedUser(uid=uid, email=decoded.get("email"))
