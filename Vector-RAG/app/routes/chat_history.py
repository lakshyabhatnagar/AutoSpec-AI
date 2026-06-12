"""Authenticated chat history routes."""
from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import (
    ChatSessionCreateRequest,
    ChatSessionDetailResponse,
    ChatSessionResponse,
    MessageCreateRequest,
    MessageResponse,
)
from app.routes.deps import require_user
from app.services import auth_service, chat_history_service

router = APIRouter(prefix="/chat-sessions", tags=["Chat History"])


@router.post("", response_model=ChatSessionResponse)
def create_session(req: ChatSessionCreateRequest, user: dict = Depends(require_user)):
    session = chat_history_service.create_session(str(user["_id"]), req.title)
    return ChatSessionResponse(**chat_history_service.serialize_session(session))


@router.get("", response_model=list[ChatSessionResponse])
def list_sessions(user: dict = Depends(require_user)):
    return [ChatSessionResponse(**chat_history_service.serialize_session(s)) for s in chat_history_service.list_sessions(str(user["_id"]))]


@router.get("/{session_id}", response_model=ChatSessionDetailResponse)
def get_session(session_id: str, user: dict = Depends(require_user)):
    try:
        session = chat_history_service.get_session(str(user["_id"]), session_id)
        messages = chat_history_service.list_messages(str(user["_id"]), session_id)
        return ChatSessionDetailResponse(
            session=ChatSessionResponse(**chat_history_service.serialize_session(session)),
            messages=[MessageResponse(**chat_history_service.serialize_message(m)) for m in messages],
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Chat session not found.") from exc


@router.post("/{session_id}/messages", response_model=MessageResponse)
def add_message(session_id: str, req: MessageCreateRequest, user: dict = Depends(require_user)):
    try:
        message = chat_history_service.add_message(str(user["_id"]), session_id, req.role, req.content, req.metadata)
        return MessageResponse(**chat_history_service.serialize_message(message))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Chat session not found.") from exc


@router.delete("/{session_id}")
def delete_session(session_id: str, user: dict = Depends(require_user)):
    try:
        chat_history_service.delete_session(str(user["_id"]), session_id)
        return {"status": "deleted"}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Chat session not found.") from exc
