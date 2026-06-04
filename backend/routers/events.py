from fastapi import APIRouter, HTTPException, Depends
from database import get_pool
import asyncpg
from routers.auth import get_current_user

router = APIRouter()


@router.get("/active")
async def get_active_event(pool: asyncpg.Pool = Depends(get_pool)):
    event = await pool.fetchrow(
        "SELECT * FROM events WHERE status = 'active' ORDER BY date DESC LIMIT 1"
    )
    if not event:
        raise HTTPException(404, "No active event")
    result = dict(event)
    result["id"] = str(result["id"])
    return result


@router.post("/{event_id}/join")
async def join_event(event_id: str, pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    twin = await pool.fetchrow("SELECT * FROM twins WHERE user_id = $1", user["id"])
    if not twin:
        raise HTTPException(400, "Create your twin first")

    from pydantic import BaseModel
    import json

    class JoinRequest(BaseModel):
        explore_goals: list[str] = []
        custom_goal: str | None = None

    try:
        await pool.execute(
            """INSERT INTO event_participants (event_id, user_id, twin_id, explore_goals, custom_goal)
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5)
            ON CONFLICT (event_id, user_id) DO UPDATE SET explore_goals = $4, custom_goal = $5""",
            event_id, user["id"], twin["id"],
            [], None,
        )
    except Exception as e:
        raise HTTPException(400, str(e))

    return {"status": "joined"}


@router.get("/{event_id}/stats")
async def event_stats(event_id: str, pool: asyncpg.Pool = Depends(get_pool)):
    count = await pool.fetchval(
        "SELECT COUNT(*) FROM event_participants WHERE event_id = $1::uuid",
        event_id,
    )
    return {"participant_count": count}
