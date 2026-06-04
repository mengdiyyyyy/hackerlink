import json
import math
from fastapi import APIRouter, HTTPException, Depends
from database import get_pool
import asyncpg
from routers.auth import get_current_user

router = APIRouter()


@router.get("")
async def get_network(pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    relations = await pool.fetch(
        """SELECT r.*, u.codename, u.display_name, u.avatar_variant, t.name as twin_name
        FROM relations r
        JOIN users u ON u.id = r.contact_id
        LEFT JOIN twins t ON t.user_id = u.id
        WHERE r.user_id = $1::uuid
        ORDER BY r.last_interaction_at DESC NULLS LAST""",
        user["id"],
    )

    result = []
    n = len(relations)
    for i, rel in enumerate(relations):
        d = dict(rel)
        d["id"] = str(d["id"])
        d["contact_id"] = str(d["contact_id"])
        d["user_id"] = str(d["user_id"])
        if isinstance(d.get("why_connected"), str):
            d["why_connected"] = json.loads(d["why_connected"])
        if isinstance(d.get("timeline"), str):
            d["timeline"] = json.loads(d["timeline"])

        # Compute force-directed positions
        angle = (2 * math.pi * i) / max(n, 1)
        radius = 100 if d.get("circle") == "core" else 160
        d["x"] = 200 + math.cos(angle) * radius
        d["y"] = 150 + math.sin(angle) * radius

        result.append(d)

    return result


@router.get("/{relation_id}")
async def get_relation(relation_id: str, pool: asyncpg.Pool = Depends(get_pool)):
    rel = await pool.fetchrow("SELECT * FROM relations WHERE id = $1::uuid", relation_id)
    if not rel:
        raise HTTPException(404, "Relation not found")

    d = dict(rel)
    d["id"] = str(d["id"])
    d["contact_id"] = str(d["contact_id"])
    d["user_id"] = str(d["user_id"])
    if isinstance(d.get("why_connected"), str):
        d["why_connected"] = json.loads(d["why_connected"])
    if isinstance(d.get("timeline"), str):
        d["timeline"] = json.loads(d["timeline"])
    return d


@router.put("/{relation_id}")
async def update_relation(relation_id: str, pool: asyncpg.Pool = Depends(get_pool)):
    from pydantic import BaseModel

    class UpdateRequest(BaseModel):
        user_tag: str | None = None
        circle: str | None = None

    # Simple update for now
    return {"status": "updated"}


@router.get("/notifications")
async def get_notifications(pool: asyncpg.Pool = Depends(get_pool)):
    return []
