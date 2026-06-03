import json
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_pool
from redis_client import get_redis
import asyncpg
import redis.asyncio as aioredis
from routers.auth import get_current_user

router = APIRouter()


class ExploreStartRequest(BaseModel):
    event_id: str
    goals: list[str] = []
    custom_goal: str | None = None


class SelectRequest(BaseModel):
    selected_user_ids: list[str] = []


@router.post("/start")
async def start_explore(
    req: ExploreStartRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    user=Depends(get_current_user),
):
    twin = await pool.fetchrow("SELECT * FROM twins WHERE user_id = $1", user["id"])
    if not twin:
        raise HTTPException(400, "Create your twin first")

    # Join event if not already
    await pool.execute(
        """INSERT INTO event_participants (event_id, user_id, twin_id, explore_goals, custom_goal)
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5)
        ON CONFLICT (event_id, user_id) DO NOTHING""",
        req.event_id, user["id"], twin["id"], req.goals, req.custom_goal,
    )

    # Start background matching task
    redis = await get_redis()
    task_key = f"explore:{user['id']}"
    await redis.set(f"{task_key}:status", "running")
    await redis.set(f"{task_key}:progress", "0")

    # In production, use a task queue (Celery/ARQ)
    # Here we trigger a background coroutine
    asyncio.create_task(run_matching(pool, redis, str(user["id"]), str(twin["id"]), req.event_id))

    return {"status": "started", "task_key": task_key}


async def run_matching(
    pool: asyncpg.Pool,
    redis: aioredis.Redis,
    user_id: str,
    twin_id: str,
    event_id: str,
):
    """Background task: match twin against all other twins in the event."""
    task_key = f"explore:{user_id}"

    try:
        # Get all other twins in this event
        others = await pool.fetch(
            """SELECT t.*, u.codename, u.display_name, u.avatar_variant
            FROM event_participants ep
            JOIN twins t ON t.id = ep.twin_id
            JOIN users u ON u.id = t.user_id
            WHERE ep.event_id = $1::uuid AND t.user_id != $2::uuid""",
            event_id, user_id,
        )

        if not others:
            await ensure_demo_participants(pool, event_id)
            others = await pool.fetch(
                """SELECT t.*, u.codename, u.display_name, u.avatar_variant
                FROM event_participants ep
                JOIN twins t ON t.id = ep.twin_id
                JOIN users u ON u.id = t.user_id
                WHERE ep.event_id = $1::uuid AND t.user_id != $2::uuid""",
                event_id, user_id,
            )

        results = []
        for i, other in enumerate(others):
            # Simulate matching (in production, call AI for twin-to-twin conversation)
            score = 50 + (hash(twin_id + str(other["id"])) % 50)
            other_slices = json.loads(other["soul_slices"]) if isinstance(other["soul_slices"], str) else other["soul_slices"]

            results.append({
                "twin_id": str(other["id"]),
                "user_id": str(other["user_id"]),
                "codename": other["codename"],
                "display_name": other["display_name"],
                "avatar_variant": other["avatar_variant"],
                "twin_name": other["name"],
                "vibe_summary": other["vibe_summary"],
                "match_score": score,
                "match_reasons": {
                    "resonance": f"同频点：你们都关注{other['topic_type']}，也都偏好真实项目导向",
                    "complement": "互补点：TA 偏底层实现，你偏产品体验，天然可组队",
                    "taste": "Taste 契合：都讨厌无效社交，能快速进入问题",
                },
                "soul_slices_of_b": other_slices[:3],
                "why_you_two": f"你们在{other['topic_type']}上有共同语言，但互补点更强：TA 能补你当前项目里缺的判断或实现。",
                "coffee_chat_suggestion": f"从「{other['topic_type']}」切入，约 15 分钟判断是否值得赛后继续推进。",
            })

            progress = int(((i + 1) / len(others)) * 100)
            await redis.set(f"{task_key}:progress", str(progress))

        # Sort by score
        results.sort(key=lambda x: x["match_score"], reverse=True)

        await redis.set(f"{task_key}:status", "completed")
        await redis.set(f"{task_key}:progress", "100")
        await redis.set(f"{task_key}:results", json.dumps(results))

    except Exception as e:
        await redis.set(f"{task_key}:status", "error")
        await redis.set(f"{task_key}:error", str(e))


@router.get("/status")
async def get_status(pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    redis = await get_redis()
    task_key = f"explore:{user['id']}"
    status = await redis.get(f"{task_key}:status")

    if not status:
        return {"status": "idle", "progress": 0}

    progress = int(await redis.get(f"{task_key}:progress") or "0")

    response = {"status": status, "progress": progress}

    if status == "completed":
        results_json = await redis.get(f"{task_key}:results")
        if results_json:
            response["results"] = json.loads(results_json)

    return response


@router.get("/results")
async def get_results(pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    redis = await get_redis()
    task_key = f"explore:{user['id']}"
    results_json = await redis.get(f"{task_key}:results")

    if not results_json:
        raise HTTPException(404, "No results yet")

    return json.loads(results_json)


@router.post("/select")
async def select_matches(
    req: SelectRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    user=Depends(get_current_user),
):
    event_id = await pool.fetchval("SELECT id FROM events WHERE status = 'active' ORDER BY date DESC LIMIT 1")
    created = 0
    conversation_ids = []
    for selected_user_id in req.selected_user_ids:
        if selected_user_id == str(user["id"]):
            continue
        existing = await pool.fetchval(
            """SELECT id FROM user_conversations
            WHERE event_id = $1
              AND (
                (user_a_id = $2 AND user_b_id = $3::uuid)
                OR (user_a_id = $3::uuid AND user_b_id = $2)
              )""",
            event_id, user["id"], selected_user_id,
        )
        if existing:
            conversation_ids.append(str(existing))
            continue
        conversation_id = await pool.fetchval(
            """INSERT INTO user_conversations (event_id, user_a_id, user_b_id, messages, controller)
            VALUES ($1, $2, $3::uuid, $4::jsonb, 'twin_a')
            RETURNING id""",
            event_id,
            user["id"],
            selected_user_id,
            json.dumps([{
                "role": "system",
                "content": "Agent 认为你们值得聊聊，已创建关系对话。",
                "timestamp": "2026-05-31T12:00:00Z",
            }]),
        )
        conversation_ids.append(str(conversation_id))
        created += 1
    return {"status": "selected", "count": created, "conversation_ids": conversation_ids}


async def ensure_demo_participants(pool: asyncpg.Pool, event_id: str):
    """Seed the real MBA-profile agents as event participants.

    Kept under the original name because explore's matching task calls it; it
    now delegates to the shared profile-agent seeder so explore and the message
    list use the same people.
    """
    from agent_profiles import ensure_agents

    await ensure_agents(pool, str(event_id))
