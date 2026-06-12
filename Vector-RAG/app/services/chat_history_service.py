"""Persistent per-user chat sessions and messages."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from app.db.mongodb import chat_sessions_collection, messages_collection


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise ValueError("Invalid id.")
    return ObjectId(value)


def serialize_session(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "userId": str(doc["userId"]),
        "title": doc.get("title") or "Untitled chat",
        "createdAt": iso(doc["createdAt"]),
        "updatedAt": iso(doc["updatedAt"]),
    }


def serialize_message(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "sessionId": str(doc["sessionId"]),
        "userId": str(doc["userId"]),
        "role": doc["role"],
        "content": doc["content"],
        "metadata": doc.get("metadata"),
        "createdAt": iso(doc["createdAt"]),
    }


def create_session(user_id: str, title: str | None = None) -> dict[str, Any]:
    now = utc_now()
    doc = {
        "userId": _oid(user_id),
        "title": (title or "New chat").strip()[:120],
        "createdAt": now,
        "updatedAt": now,
    }
    result = chat_sessions_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


def list_sessions(user_id: str) -> list[dict[str, Any]]:
    return list(chat_sessions_collection.find({"userId": _oid(user_id)}).sort("updatedAt", -1))


def get_session(user_id: str, session_id: str) -> dict[str, Any]:
    session = chat_sessions_collection.find_one({"_id": _oid(session_id), "userId": _oid(user_id)})
    if session is None:
        raise ValueError("Chat session not found.")
    return session


def list_messages(user_id: str, session_id: str) -> list[dict[str, Any]]:
    get_session(user_id, session_id)
    return list(messages_collection.find({"sessionId": _oid(session_id), "userId": _oid(user_id)}).sort("createdAt", 1))


def add_message(user_id: str, session_id: str, role: str, content: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    session = get_session(user_id, session_id)
    now = utc_now()
    doc = {
        "sessionId": session["_id"],
        "userId": _oid(user_id),
        "role": role,
        "content": content,
        "metadata": metadata or {},
        "createdAt": now,
    }
    result = messages_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    update: dict[str, Any] = {"updatedAt": now}
    if role == "user" and session.get("title") in {None, "New chat", "Untitled chat"}:
        update["title"] = content.strip()[:80] or "New chat"
    chat_sessions_collection.update_one({"_id": session["_id"]}, {"$set": update})
    return doc


def delete_session(user_id: str, session_id: str) -> None:
    session = get_session(user_id, session_id)
    messages_collection.delete_many({"sessionId": session["_id"], "userId": _oid(user_id)})
    chat_sessions_collection.delete_one({"_id": session["_id"], "userId": _oid(user_id)})
