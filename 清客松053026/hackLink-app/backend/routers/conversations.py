import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from database import get_pool
import asyncpg
from pydantic import BaseModel

from routers.auth import get_current_user
from agent_config import (
    build_system_prompt,
    build_user_proxy_system_prompt,
    build_judge_prompt,
    get_agent_background,
)
from agent_profiles import ensure_agents, agent_codenames, LEGACY_DEMO_CODENAMES
from services.ai_service import agent_chat, judge_solved

router = APIRouter()


class MessageRequest(BaseModel):
    content: str


HISTORY_LIMIT = 60  # how many recent messages to replay to the model


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_messages(raw) -> list[dict]:
    if isinstance(raw, str):
        return json.loads(raw)
    return raw or []


def _my_side(conv, user_id) -> str:
    return "user_a" if str(conv["user_a_id"]) == str(user_id) else "user_b"


def _normalize_role(role: str, my_side: str) -> str:
    """Collapse stored roles into the 3 the UI/model understand."""
    if role in ("user", my_side):
        return "user"
    if role == "system":
        return "system"
    # twin_a / twin_b / agent / assistant / the other human side
    return "agent"


def _normalize_messages(messages: list[dict], my_side: str) -> list[dict]:
    out = []
    for m in messages:
        item = {
            "role": _normalize_role(m.get("role", "agent"), my_side),
            "content": m.get("content", ""),
            "timestamp": m.get("timestamp"),
        }
        if m.get("auto"):
            item["auto"] = True
        out.append(item)
    return out


def _to_glm_messages(normalized: list[dict]) -> list[dict]:
    glm = []
    for m in normalized[-HISTORY_LIMIT:]:
        if m["role"] == "user":
            glm.append({"role": "user", "content": m["content"]})
        elif m["role"] == "agent":
            glm.append({"role": "assistant", "content": m["content"]})
        # 'system' meta lines are skipped (background is its own system prompt)
    return glm


def _to_glm_messages_proxy(normalized: list[dict]) -> list[dict]:
    """Role-flipped history for generating the USER's side: from the proxy's
    point of view the agent's lines are the incoming 'user' messages."""
    glm = []
    for m in normalized[-HISTORY_LIMIT:]:
        if m["role"] == "user":
            glm.append({"role": "assistant", "content": m["content"]})
        elif m["role"] == "agent":
            glm.append({"role": "user", "content": m["content"]})
    return glm


def _transcript_text(messages: list[dict], peer_profile: dict | None) -> str:
    peer = (peer_profile or {}).get("name") or "对方"
    lines = []
    for m in messages:
        role = m.get("role")
        if role == "user":
            lines.append(f"用户：{m.get('content', '')}")
        elif role == "agent":
            lines.append(f"{peer}：{m.get('content', '')}")
    return "\n".join(lines[-2 * HISTORY_LIMIT:])


async def _twin_profile(pool: asyncpg.Pool, user_id) -> dict | None:
    row = await pool.fetchrow(
        """SELECT t.*, u.codename, u.display_name
        FROM twins t JOIN users u ON u.id = t.user_id
        WHERE t.user_id = $1::uuid""",
        str(user_id),
    )
    if not row:
        return None
    d = dict(row)
    slices = d.get("soul_slices")
    if isinstance(slices, str):
        slices = json.loads(slices)
    return {
        "name": d.get("name"),
        "display_name": d.get("display_name"),
        "codename": d.get("codename"),
        "topic_type": d.get("topic_type"),
        "topic_content": d.get("topic_content"),
        "current_blocker": d.get("current_blocker"),
        "vibe_summary": d.get("vibe_summary"),
        "background": d.get("background"),
        "soul_slices": slices or [],
        "taste_tags": list(d.get("taste_tags") or []),
        "anti_patterns": list(d.get("anti_patterns") or []),
    }


def _opener_for(peer_name: str, topic_type: str | None, user_topic: str | None) -> str:
    domain = f"我做过 {topic_type}。" if topic_type else ""
    focus = f"听说你在关注「{user_topic}」——" if user_topic else ""
    return (
        f"嗨，我是 {peer_name}。{domain}"
        f"{focus}说说你现在最大的卡点，我用我的经验陪你一步步把它解决。"
    )


async def _ensure_agent_conversations(pool: asyncpg.Pool, user) -> None:
    """Make sure the user has one conversation with each real MBA-profile agent,
    and drop any stale demo threads from earlier builds."""
    event_id = await pool.fetchval(
        "SELECT id FROM events WHERE status = 'active' ORDER BY date DESC LIMIT 1"
    )
    if not event_id:
        return

    await ensure_agents(pool, str(event_id))

    # Remove the old hard-coded demo conversations so the list only shows the
    # real people from the profile markdowns.
    await pool.execute(
        """DELETE FROM user_conversations uc
        USING users peer
        WHERE ((uc.user_a_id = $1::uuid AND uc.user_b_id = peer.id)
            OR (uc.user_b_id = $1::uuid AND uc.user_a_id = peer.id))
          AND peer.codename = ANY($2::text[])""",
        str(user["id"]), LEGACY_DEMO_CODENAMES,
    )

    codenames = agent_codenames()
    if not codenames:
        return

    agents = await pool.fetch(
        """SELECT u.id, u.display_name, t.name AS twin_name, t.topic_type
        FROM users u JOIN twins t ON t.user_id = u.id
        WHERE u.codename = ANY($1::text[])
        ORDER BY u.display_name""",
        codenames,
    )

    existing = await pool.fetch(
        """SELECT user_a_id, user_b_id FROM user_conversations
        WHERE user_a_id = $1::uuid OR user_b_id = $1::uuid""",
        str(user["id"]),
    )
    paired: set[str] = set()
    for row in existing:
        paired.add(str(row["user_a_id"]))
        paired.add(str(row["user_b_id"]))

    user_twin = await _twin_profile(pool, user["id"])
    user_topic = (user_twin or {}).get("topic_type")

    for ag in agents:
        if str(ag["id"]) in paired:
            continue
        peer_name = ag["display_name"] or ag["twin_name"] or "MBA 同学"
        opener = _opener_for(peer_name, ag["topic_type"], user_topic)
        await pool.execute(
            """INSERT INTO user_conversations (event_id, user_a_id, user_b_id, messages, controller)
            VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, 'agent')""",
            str(event_id), str(user["id"]), ag["id"],
            json.dumps([{"role": "agent", "content": opener, "timestamp": _now()}]),
        )


def _other_user_from_row(d: dict, is_a: bool) -> dict:
    return {
        "codename": d["user_b_codename"] if is_a else d["user_a_codename"],
        "display_name": d["user_b_display"] if is_a else d["user_a_display"],
        "avatar_variant": d["user_b_avatar"] if is_a else d["user_a_avatar"],
        "twin_name": (d.get("twin_b_name") if is_a else d.get("twin_a_name")) or "Agent",
        "vibe_summary": (d.get("twin_b_vibe") if is_a else d.get("twin_a_vibe")) or "",
    }


_CONV_SELECT = """SELECT uc.*,
    ua.codename as user_a_codename, ua.display_name as user_a_display, ua.avatar_variant as user_a_avatar,
    ub.codename as user_b_codename, ub.display_name as user_b_display, ub.avatar_variant as user_b_avatar,
    ta.name as twin_a_name, tb.name as twin_b_name,
    ta.vibe_summary as twin_a_vibe, tb.vibe_summary as twin_b_vibe
FROM user_conversations uc
JOIN users ua ON ua.id = uc.user_a_id
JOIN users ub ON ub.id = uc.user_b_id
LEFT JOIN twins ta ON ta.user_id = ua.id
LEFT JOIN twins tb ON tb.user_id = ub.id"""


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
@router.get("")
async def list_conversations(pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    try:
        await _ensure_agent_conversations(pool, user)
    except Exception as exc:  # seeding is best-effort
        print(f"[conversations] agent seed skipped: {exc}")

    conversations = await pool.fetch(
        _CONV_SELECT
        + """
        WHERE uc.user_a_id = $1::uuid OR uc.user_b_id = $1::uuid
        ORDER BY uc.created_at DESC""",
        str(user["id"]),
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

        is_a = str(d["user_a_id"]) == str(user["id"])
        my_side = "user_a" if is_a else "user_b"
        d["messages"] = _normalize_messages(_parse_messages(d.get("messages")), my_side)
        d["other_user"] = _other_user_from_row(d, is_a)
        result.append(d)

    return result


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    pool: asyncpg.Pool = Depends(get_pool),
    user=Depends(get_current_user),
):
    conv = await pool.fetchrow(_CONV_SELECT + "\nWHERE uc.id = $1::uuid", conversation_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")
    if str(conv["user_a_id"]) != str(user["id"]) and str(conv["user_b_id"]) != str(user["id"]):
        raise HTTPException(403, "Not your conversation")

    d = dict(conv)
    is_a = str(d["user_a_id"]) == str(user["id"])
    my_side = "user_a" if is_a else "user_b"
    return {
        "id": str(d["id"]),
        "event_id": str(d["event_id"]),
        "user_a_id": str(d["user_a_id"]),
        "user_b_id": str(d["user_b_id"]),
        "controller": d.get("controller"),
        "status": d.get("status"),
        "me_role": my_side,
        "other_user": _other_user_from_row(d, is_a),
        "messages": _normalize_messages(_parse_messages(d.get("messages")), my_side),
    }


async def _load_conv_for_user(pool, conversation_id, user):
    conv = await pool.fetchrow("SELECT * FROM user_conversations WHERE id = $1::uuid", conversation_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")
    if str(conv["user_a_id"]) != str(user["id"]) and str(conv["user_b_id"]) != str(user["id"]):
        raise HTTPException(403, "Not your conversation")
    return conv


@router.post("/{conversation_id}/chat")
async def chat(
    conversation_id: str,
    req: MessageRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    user=Depends(get_current_user),
):
    """Send a user message and get a GLM reply, persisting full history as context."""
    content = (req.content or "").strip()
    if not content:
        raise HTTPException(400, "content cannot be empty")

    conv = await _load_conv_for_user(pool, conversation_id, user)
    my_side = _my_side(conv, user["id"])
    peer_id = conv["user_b_id"] if my_side == "user_a" else conv["user_a_id"]

    messages = _parse_messages(conv["messages"])
    messages.append({"role": "user", "content": content, "timestamp": _now()})

    # Build context: agent background + user's registration profile + peer persona
    user_profile = await _twin_profile(pool, user["id"])
    peer_profile = await _twin_profile(pool, peer_id)
    system_prompt = build_system_prompt(get_agent_background(), user_profile, peer_profile)

    normalized = _normalize_messages(messages, my_side)
    glm_messages = _to_glm_messages(normalized)

    try:
        reply = await agent_chat(glm_messages, system_prompt=system_prompt)
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from exc

    messages.append({"role": "agent", "content": reply, "timestamp": _now()})

    await pool.execute(
        "UPDATE user_conversations SET messages = $1::jsonb WHERE id = $2::uuid",
        json.dumps(messages),
        conversation_id,
    )

    return {"reply": reply, "messages": _normalize_messages(messages, my_side)}


@router.post("/{conversation_id}/auto-step")
async def auto_step(
    conversation_id: str,
    pool: asyncpg.Pool = Depends(get_pool),
    user=Depends(get_current_user),
):
    """Run ONE automated round: the user's proxy speaks, the agent replies, and
    a judge checks whether the user's registered issue is now solved.

    The frontend caps the number of rounds (max 10) and can stop/continue/restart;
    each call here advances the dialogue by exactly one round."""
    conv = await _load_conv_for_user(pool, conversation_id, user)
    my_side = _my_side(conv, user["id"])
    peer_id = conv["user_b_id"] if my_side == "user_a" else conv["user_a_id"]

    messages = _parse_messages(conv["messages"])
    user_profile = await _twin_profile(pool, user["id"])
    peer_profile = await _twin_profile(pool, peer_id)

    # 1) The user's proxy speaks (pushing to solve their own issue).
    proxy_system = build_user_proxy_system_prompt(user_profile, peer_profile)
    proxy_glm = _to_glm_messages_proxy(_normalize_messages(messages, my_side))
    try:
        user_text = await agent_chat(proxy_glm, system_prompt=proxy_system, max_tokens=256)
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from exc
    user_msg = {"role": "user", "content": user_text, "timestamp": _now(), "auto": True}
    messages.append(user_msg)

    # 2) The agent (the real MBA person) replies to help.
    agent_system = build_system_prompt(get_agent_background(), user_profile, peer_profile)
    agent_glm = _to_glm_messages(_normalize_messages(messages, my_side))
    try:
        agent_text = await agent_chat(agent_glm, system_prompt=agent_system, max_tokens=400)
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from exc
    agent_msg = {"role": "agent", "content": agent_text, "timestamp": _now(), "auto": True}
    messages.append(agent_msg)

    # 3) Judge whether the issue is solved + confirmed.
    transcript = _transcript_text(messages, peer_profile)
    verdict = await judge_solved(build_judge_prompt(user_profile, transcript))

    await pool.execute(
        "UPDATE user_conversations SET messages = $1::jsonb WHERE id = $2::uuid",
        json.dumps(messages),
        conversation_id,
    )

    return {
        "user_message": {"role": "user", "content": user_text, "auto": True, "timestamp": user_msg["timestamp"]},
        "agent_message": {"role": "agent", "content": agent_text, "auto": True, "timestamp": agent_msg["timestamp"]},
        "solved": verdict["solved"],
        "solved_reason": verdict["reason"],
        "messages": _normalize_messages(messages, my_side),
    }


@router.post("/{conversation_id}/reset")
async def reset_conversation(
    conversation_id: str,
    pool: asyncpg.Pool = Depends(get_pool),
    user=Depends(get_current_user),
):
    """Clear all history and start a fresh thread with just the agent's opener."""
    conv = await _load_conv_for_user(pool, conversation_id, user)
    my_side = _my_side(conv, user["id"])
    peer_id = conv["user_b_id"] if my_side == "user_a" else conv["user_a_id"]

    peer_profile = await _twin_profile(pool, peer_id)
    user_profile = await _twin_profile(pool, user["id"])
    peer_name = (peer_profile or {}).get("display_name") or (peer_profile or {}).get("name") or "MBA 同学"
    opener = _opener_for(
        peer_name,
        (peer_profile or {}).get("topic_type"),
        (user_profile or {}).get("topic_type"),
    )
    messages = [{"role": "agent", "content": opener, "timestamp": _now()}]

    await pool.execute(
        "UPDATE user_conversations SET messages = $1::jsonb, controller = 'agent' WHERE id = $2::uuid",
        json.dumps(messages),
        conversation_id,
    )
    return {"messages": _normalize_messages(messages, my_side)}


@router.post("/{conversation_id}/takeover")
async def takeover(conversation_id: str, pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    conv = await _load_conv_for_user(pool, conversation_id, user)
    controller = "user_a" if str(conv["user_a_id"]) == str(user["id"]) else "user_b"
    await pool.execute(
        "UPDATE user_conversations SET controller = $1 WHERE id = $2::uuid",
        controller, conversation_id,
    )
    return {"status": "taken_over", "controller": controller}


@router.post("/{conversation_id}/handback")
async def handback(conversation_id: str, pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    conv = await _load_conv_for_user(pool, conversation_id, user)
    controller = "twin_a" if str(conv["user_a_id"]) == str(user["id"]) else "twin_b"
    await pool.execute(
        "UPDATE user_conversations SET controller = $1 WHERE id = $2::uuid",
        controller, conversation_id,
    )
    return {"status": "handed_back", "controller": controller}
