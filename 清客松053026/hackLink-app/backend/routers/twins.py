import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_pool
import asyncpg
from services.ai_service import generate_twin
from routers.auth import get_current_user

router = APIRouter()


class OnboardingRequest(BaseModel):
    topic_type: str
    topic_content: str
    current_blocker: str | None = None


class OnboardingResponse(BaseModel):
    twin: dict


@router.post("/onboarding", response_model=OnboardingResponse)
async def onboarding(
    req: OnboardingRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    user=Depends(get_current_user),
):
    # Call AI to generate twin
    try:
        twin_data = await generate_twin(
            topic_type=req.topic_type,
            topic_content=req.topic_content,
            current_blocker=req.current_blocker,
        )
    except Exception:
        # Fallback if AI is not available
        twin_data = {
            "name": "Echo",
            "vibe_summary": f"在{req.topic_type}上有独到见解的深度思考者",
            "soul_slices": [
                {"text": f"你对「{req.topic_type}」有独特的洞察", "source": "taste"},
                {"text": f"你关注的核心是：{req.topic_content[:30]}...", "source": "judgment"},
                {"text": req.current_blocker or "你正在探索新的可能性", "source": "blocker"},
            ],
            "taste_tags": ["#AI Builder", "#Deep Thinker", "#不爱泛聊"],
            "anti_patterns": ["无效社交", "泛泛而谈"],
        }

    # Check if twin already exists
    existing = await pool.fetchrow("SELECT id FROM twins WHERE user_id = $1", user["id"])

    if existing:
        await pool.execute(
            """UPDATE twins SET
                name = $1, topic_type = $2, topic_content = $3, current_blocker = $4,
                vibe_summary = $5, soul_slices = $6::jsonb, taste_tags = $7, anti_patterns = $8,
                updated_at = NOW()
            WHERE user_id = $9""",
            twin_data["name"], req.topic_type, req.topic_content, req.current_blocker,
            twin_data["vibe_summary"],
            json.dumps(twin_data["soul_slices"]),
            twin_data["taste_tags"],
            twin_data["anti_patterns"],
            user["id"],
        )
        twin_id = existing["id"]
    else:
        twin_id = await pool.fetchval(
            """INSERT INTO twins (user_id, name, topic_type, topic_content, current_blocker,
                vibe_summary, soul_slices, taste_tags, anti_patterns)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9) RETURNING id""",
            user["id"], twin_data["name"], req.topic_type, req.topic_content, req.current_blocker,
            twin_data["vibe_summary"],
            json.dumps(twin_data["soul_slices"]),
            twin_data["taste_tags"],
            twin_data["anti_patterns"],
        )

    twin_row = await pool.fetchrow("SELECT * FROM twins WHERE id = $1", twin_id)
    twin_dict = dict(twin_row)
    twin_dict["id"] = str(twin_dict["id"])
    twin_dict["user_id"] = str(twin_dict["user_id"])
    if isinstance(twin_dict["soul_slices"], str):
        twin_dict["soul_slices"] = json.loads(twin_dict["soul_slices"])

    return OnboardingResponse(twin=twin_dict)


@router.get("/me")
async def get_my_twin(pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    twin = await pool.fetchrow("SELECT * FROM twins WHERE user_id = $1", user["id"])
    if not twin:
        raise HTTPException(404, "Twin not found")

    result = dict(twin)
    result["id"] = str(result["id"])
    result["user_id"] = str(result["user_id"])
    if isinstance(result["soul_slices"], str):
        result["soul_slices"] = json.loads(result["soul_slices"])
    return result


@router.get("/{twin_id}")
async def get_twin(twin_id: str, pool: asyncpg.Pool = Depends(get_pool)):
    twin = await pool.fetchrow("SELECT * FROM twins WHERE id = $1::uuid", twin_id)
    if not twin:
        raise HTTPException(404, "Twin not found")

    result = dict(twin)
    result["id"] = str(result["id"])
    result["user_id"] = str(result["user_id"])
    if isinstance(result["soul_slices"], str):
        result["soul_slices"] = json.loads(result["soul_slices"])
    return result
