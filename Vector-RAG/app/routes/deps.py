"""FastAPI route dependencies."""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.auth_service import AuthError, get_user_by_id, verify_token

bearer = HTTPBearer(auto_error=False)


def require_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentication required.")
    try:
        payload = verify_token(credentials.credentials)
        return get_user_by_id(str(payload["sub"]))
    except AuthError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session.") from exc
