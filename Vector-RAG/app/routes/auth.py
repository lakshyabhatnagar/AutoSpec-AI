"""Authentication routes."""
from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import AuthResponse, LoginRequest, SignupRequest, UserResponse
from app.routes.deps import require_user
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/signup", response_model=AuthResponse)
def signup(req: SignupRequest):
    try:
      user = auth_service.create_user(req.name, req.email, req.password)
      return AuthResponse(token=auth_service.issue_token(str(user["_id"])), user=UserResponse(**auth_service.serialize_user(user)))
    except ValueError as exc:
      raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    try:
        user = auth_service.authenticate_user(req.email, req.password)
        return AuthResponse(token=auth_service.issue_token(str(user["_id"])), user=UserResponse(**auth_service.serialize_user(user)))
    except auth_service.AuthError as exc:
        raise HTTPException(status_code=401, detail="Invalid email or password.") from exc


@router.get("/me", response_model=UserResponse)
def me(user: dict = Depends(require_user)):
    return UserResponse(**auth_service.serialize_user(user))


@router.post("/logout")
def logout():
    return {"status": "ok"}
