import json
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from database import get_pool
import asyncpg
from pydantic import BaseModel
from routers.auth import get_current_user

router = APIRouter()


class MessageRequest(BaseModel):
    content: str


@router.get("")
async def list_conversations(pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    conversations = await pool.fetch(
        """SELECT uc.*,
            ua.codename as user_a_codename, ua.display_name as user_a_display, ua.avatar_variant as user_a_avatar,
            ub.codename as user_b_codename, ub.display_name as user_b_display, ub.avatar_variant as user_b_avatar,
            tb.name as twin_b_name
        FROM user_conversations uc
        JOIN users ua ON ua.id = uc.user_a_id
        JOIN users ub ON ub.id = uc.user_b_id
        JOIN twins tb ON tb.user_id = ub.id
        WHERE uc.user_a_id = $1::uuid OR uc.user_b_id = $1::uuid
        ORDER BY uc.created_at DESC""",
        user["id"],
    )

    result = []
    for conv in conversations:
        d = dict(conv)
        d["id"] = str(d["id"])
        d["event_id"] = str(d["event_id"])
        d["user_a_id"] = str(d["user_a_id"])
        d["user_b_id"] = str(d["user_b_id"])
        if d.get("twin_conversation_id"):
            d["twin_conversation_id"] = str(d["twin_conversation_id"])
        if isinstance(d.get("messages"), str):
            d["messages"] = json.loads(d["messages"])

        is_a = str(d["user_a_id"]) == str(user["id"])
        d["other_user"] = {
            "codename": d["user_b_codename"] if is_a else d["user_a_codename"],
            "display_name": d["user_b_display"] if is_a else d["user_a_display"],
            "avatar_variant": d["user_b_avatar"] if is_a else d["user_a_avatar"],
            "twin_name": d.get("twin_b_name", "Twin"),
        }
        result.append(d)

    return result


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    pool: asyncpg.Pool = Depends(get_pool),
    user=Depends(get_current_user),
):
    conv = await pool.fetchrow("SELECT * FROM user_conversations WHERE id = $1::uuid", conversation_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")
    if str(conv["user_a_id"]) != str(user["id"]) and str(conv["user_b_id"]) != str(user["id"]):
        raise HTTPException(403, "Not your conversation")

    d = dict(conv)
    d["id"] = str(d["id"])
    if isinstance(d.get("messages"), str):
        d["messages"] = json.loads(d["messages"])
    return d


@router.post("/{conversation_id}/takeover")
async def takeover(conversation_id: str, pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    conv = await pool.fetchrow("SELECT * FROM user_conversations WHERE id = $1::uuid", conversation_id)
    if not conv:
        raise HTTPException(404, "Not found")
    if str(conv["user_a_id"]) != str(user["id"]) and str(conv["user_b_id"]) != str(user["id"]):
        raise HTTPException(403, "Not your conversation")

    controller = "user_a" if str(conv["user_a_id"]) == str(user["id"]) else "user_b"
    await pool.execute(
        "UPDATE user_conversations SET controller = $1 WHERE id = $2::uuid",
        controller, conversation_id,
    )
    return {"status": "taken_over", "controller": controller}


@router.post("/{conversation_id}/handback")
async def handback(conversation_id: str, pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    conv = await pool.fetchrow("SELECT * FROM user_conversations WHERE id = $1::uuid", conversation_id)
    if not conv:
        raise HTTPException(404, "Not found")
    if str(conv["user_a_id"]) != str(user["id"]) and str(conv["user_b_id"]) != str(user["id"]):
        raise HTTPException(403, "Not your conversation")

    controller = "twin_a" if str(conv["user_a_id"]) == str(user["id"]) else "twin_b"
    await pool.execute(
        "UPDATE user_conversations SET controller = $1 WHERE id = $2::uuid",
        controller, conversation_id,
    )
    return {"status": "handed_back", "controller": controller}


@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    req: MessageRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    user=Depends(get_current_user),
):
    conv = await pool.fetchrow("SELECT * FROM user_conversations WHERE id = $1::uuid", conversation_id)
    if not conv:
        raise HTTPException(404, "Not found")
    if str(conv["user_a_id"]) != str(user["id"]) and str(conv["user_b_id"]) != str(user["id"]):
        raise HTTPException(403, "Not your conversation")

    import json
    from datetime import datetime, timezone

    messages = json.loads(conv["messages"]) if isinstance(conv["messages"], str) else conv["messages"]
    role = "user_a" if str(conv["user_a_id"]) == str(user["id"]) else "user_b"
    messages.append({
        "role": role,
        "content": req.content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    await pool.execute(
        "UPDATE user_conversations SET messages = $1::jsonb WHERE id = $2::uuid",
        json.dumps(messages), conversation_id,
    )
    return {"status": "sent"}
