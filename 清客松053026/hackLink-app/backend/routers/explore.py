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
    demo_people = [
        {
            "codename": "@radical_builder_23",
            "display_name": "Brian",
            "avatar_variant": 3,
            "twin_name": "Sage",
            "topic_type": "Agent Memory",
            "topic_content": "正在做 memory layer 和 voice agent pipeline，希望找到产品判断强的人给 demo 反馈。",
            "current_blocker": "不确定 memory layer 应该先服务 infra builder 还是产品团队。",
            "vibe_summary": "慢热但很实干的 AI Infra Builder，喜欢拿真实 demo 说话。",
            "soul_slices": [
                {"text": "#慢热Builder", "source": "taste"},
                {"text": "#真实项目导向", "source": "judgment"},
                {"text": "#不爱泛聊", "source": "blocker"},
            ],
            "taste_tags": ["#Agent Memory", "#AI Infra", "#真实项目导向"],
            "anti_patterns": ["无效社交", "只有概念没有 demo"],
        },
        {
            "codename": "@deep_observer_09",
            "display_name": "Nova",
            "avatar_variant": 5,
            "twin_name": "Nova",
            "topic_type": "AI 产品信任感",
            "topic_content": "关注用户如何理解 AI 决策，希望找到可以现场测试 onboarding 的 builder。",
            "current_blocker": "需要真实 demo 观察，而不是继续讨论抽象用户画像。",
            "vibe_summary": "从用户行为出发思考产品的深度观察者，擅长把模糊需求讲清楚。",
            "soul_slices": [
                {"text": "#产品观察者", "source": "taste"},
                {"text": "#真实反馈", "source": "judgment"},
                {"text": "#细节控", "source": "blocker"},
            ],
            "taste_tags": ["#产品观察", "#真实反馈", "#细节控"],
            "anti_patterns": ["泛泛而谈", "只看指标不看体验"],
        },
        {
            "codename": "@quiet_maker_17",
            "display_name": "Lin",
            "avatar_variant": 7,
            "twin_name": "Orbit",
            "topic_type": "长期合作者",
            "topic_content": "全栈 maker，想把 hackathon demo 做成真正产品，偏好短会和明确下一步。",
            "current_blocker": "还没找到一个能共同定义体验和推进节奏的人。",
            "vibe_summary": "安静、直接、执行力很强的全栈 Maker，正在找长期合作节奏。",
            "soul_slices": [
                {"text": "#全栈Maker", "source": "taste"},
                {"text": "#长期合作者", "source": "judgment"},
                {"text": "#直接沟通", "source": "blocker"},
            ],
            "taste_tags": ["#全栈Maker", "#长期合作者", "#直接沟通"],
            "anti_patterns": ["会议过长", "没有下一步"],
        },
    ]

    for person in demo_people:
        user_id = await pool.fetchval(
            """INSERT INTO users (codename, display_name, avatar_variant)
            VALUES ($1, $2, $3)
            ON CONFLICT (codename) DO UPDATE SET
              display_name = EXCLUDED.display_name,
              avatar_variant = EXCLUDED.avatar_variant
            RETURNING id""",
            person["codename"],
            person["display_name"],
            person["avatar_variant"],
        )
        twin_id = await pool.fetchval(
            """INSERT INTO twins (
              user_id, name, topic_type, topic_content, current_blocker,
              vibe_summary, soul_slices, taste_tags, anti_patterns
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
            ON CONFLICT (user_id) DO UPDATE SET
              name = EXCLUDED.name,
              topic_type = EXCLUDED.topic_type,
              topic_content = EXCLUDED.topic_content,
              current_blocker = EXCLUDED.current_blocker,
              vibe_summary = EXCLUDED.vibe_summary,
              soul_slices = EXCLUDED.soul_slices,
              taste_tags = EXCLUDED.taste_tags,
              anti_patterns = EXCLUDED.anti_patterns,
              updated_at = NOW()
            RETURNING id""",
            user_id,
            person["twin_name"],
            person["topic_type"],
            person["topic_content"],
            person["current_blocker"],
            person["vibe_summary"],
            json.dumps(person["soul_slices"]),
            person["taste_tags"],
            person["anti_patterns"],
        )
        await pool.execute(
            """INSERT INTO event_participants (event_id, user_id, twin_id, explore_goals, custom_goal)
            VALUES ($1::uuid, $2, $3, $4, $5)
            ON CONFLICT (event_id, user_id) DO NOTHING""",
            event_id,
            user_id,
            twin_id,
            ["能给真实反馈的人", "同方向 Builder"],
            "Demo seed participant",
        )
