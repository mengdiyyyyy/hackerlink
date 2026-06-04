import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_pool
import asyncpg
from routers.auth import get_current_user

router = APIRouter()


class InviteRequest(BaseModel):
    conversation_id: str
    receiver_id: str | None = None
    event_id: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    location: str | None = None


@router.post("/invite")
async def create_invitation(
    req: InviteRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    user=Depends(get_current_user),
):
    conversation = await pool.fetchrow("SELECT * FROM user_conversations WHERE id = $1::uuid", req.conversation_id)
    if not conversation:
        raise HTTPException(404, "Conversation not found")

    receiver_id = req.receiver_id
    if not receiver_id:
        receiver_id = str(conversation["user_b_id"] if str(conversation["user_a_id"]) == str(user["id"]) else conversation["user_a_id"])
    event_id = req.event_id or str(conversation["event_id"])

    invitation_id = await pool.fetchval(
        """INSERT INTO meeting_invitations
            (conversation_id, sender_id, receiver_id, event_id, start_time, end_time, location)
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7) RETURNING id""",
        req.conversation_id, user["id"], receiver_id,
        event_id, req.start_time, req.end_time, req.location,
    )
    return {"id": str(invitation_id), "status": "pending"}


@router.get("/incoming")
async def get_incoming(pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    invitations = await pool.fetch(
        """SELECT mi.*, u.codename as sender_name, t.name as sender_twin_name
        FROM meeting_invitations mi
        JOIN users u ON u.id = mi.sender_id
        JOIN twins t ON t.user_id = mi.sender_id
        WHERE mi.receiver_id = $1::uuid AND mi.status = 'pending'
        ORDER BY mi.created_at DESC""",
        user["id"],
    )

    result = []
    for inv in invitations:
        d = dict(inv)
        d["id"] = str(d["id"])
        if isinstance(d.get("twin_suggestion"), str):
            d["twin_suggestion"] = json.loads(d["twin_suggestion"])
        result.append(d)
    return result


@router.put("/{meeting_id}/confirm")
async def confirm(meeting_id: str, pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    await pool.execute(
        """UPDATE meeting_invitations SET status = 'confirmed'
        WHERE id = $1::uuid AND (sender_id = $2 OR receiver_id = $2)""",
        meeting_id, user["id"],
    )
    return {"status": "confirmed"}


@router.put("/{meeting_id}/reschedule")
async def reschedule(meeting_id: str, pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    await pool.execute(
        """UPDATE meeting_invitations SET status = 'rescheduled'
        WHERE id = $1::uuid AND (sender_id = $2 OR receiver_id = $2)""",
        meeting_id, user["id"],
    )
    return {"status": "rescheduled"}


@router.put("/{meeting_id}/decline")
async def decline(meeting_id: str, pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    await pool.execute(
        """UPDATE meeting_invitations SET status = 'declined'
        WHERE id = $1::uuid AND (sender_id = $2 OR receiver_id = $2)""",
        meeting_id, user["id"],
    )
    return {"status": "declined"}


class FeedbackRequest(BaseModel):
    worth_level: str
    topics: str | None = None
    next_steps: list[str] = []


@router.post("/{meeting_id}/feedback")
async def submit_feedback(
    meeting_id: str,
    req: FeedbackRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    user=Depends(get_current_user),
):
    await pool.fetchval(
        """INSERT INTO meeting_feedback (meeting_id, user_id, worth_level, topics, next_steps)
        VALUES ($1::uuid, $2::uuid, $3, $4, $5) RETURNING id""",
        meeting_id, user["id"], req.worth_level, req.topics, req.next_steps,
    )

    # In production: trigger AI relation analysis here
    return {"status": "submitted"}
