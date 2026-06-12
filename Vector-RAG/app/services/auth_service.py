"""Authentication helpers for password auth and signed bearer tokens."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from app.config.settings import settings
from app.db.mongodb import users_collection


class AuthError(Exception):
    """Expected authentication failure."""


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _secret() -> bytes:
    secret = settings.AUTH_SECRET or settings.MONGO_URI
    return secret.encode("utf-8")


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _unb64(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 210_000)
    return f"pbkdf2_sha256$210000${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, rounds, salt_b64, digest_b64 = stored.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = _unb64(salt_b64)
        expected = _unb64(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(rounds))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def issue_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + settings.AUTH_TOKEN_TTL_SECONDS,
        "jti": secrets.token_urlsafe(12),
    }
    payload_b64 = _b64(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(_secret(), payload_b64.encode("utf-8"), hashlib.sha256).digest()
    return f"{payload_b64}.{_b64(signature)}"


def verify_token(token: str) -> dict[str, Any]:
    try:
        payload_b64, signature_b64 = token.split(".", 1)
        expected = hmac.new(_secret(), payload_b64.encode("utf-8"), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _unb64(signature_b64)):
            raise AuthError("Invalid token.")
        payload = json.loads(_unb64(payload_b64))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise AuthError("Expired token.")
        return payload
    except AuthError:
        raise
    except Exception as exc:
        raise AuthError("Invalid token.") from exc


def serialize_user(user: dict[str, Any]) -> dict[str, str]:
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "createdAt": iso(user["createdAt"]),
        "updatedAt": iso(user["updatedAt"]),
    }


def create_user(name: str, email: str, password: str) -> dict[str, Any]:
    normalized_email = email.strip().lower()
    if users_collection.find_one({"email": normalized_email}, {"_id": 1}):
        raise ValueError("Email already registered.")
    now = utc_now()
    result = users_collection.insert_one({
        "name": name.strip(),
        "email": normalized_email,
        "passwordHash": hash_password(password),
        "createdAt": now,
        "updatedAt": now,
    })
    user = users_collection.find_one({"_id": result.inserted_id})
    if user is None:
        raise RuntimeError("User creation failed.")
    return user


def authenticate_user(email: str, password: str) -> dict[str, Any]:
    user = users_collection.find_one({"email": email.strip().lower()})
    if user is None or not verify_password(password, user.get("passwordHash", "")):
        raise AuthError("Invalid email or password.")
    return user


def get_user_by_id(user_id: str) -> dict[str, Any]:
    if not ObjectId.is_valid(user_id):
        raise AuthError("Invalid user.")
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise AuthError("User not found.")
    return user
