import json
import asyncio
import urllib.error
import urllib.request

from config import get_settings

TWIN_GENERATION_PROMPT = """你是一个帮助用户提炼自我认知的 AI。根据用户的回答，生成以下内容：

用户回答：
- 话题类型：{topic_type}
- 具体内容：{topic_content}
- 当前卡点：{current_blocker}

请生成（严格 JSON 格式，不要其他文字）：
1. name: 给分身起一个英文名字（简洁有个性，如 Milo, Echo, Sage）
2. vibe_summary: 一句话概括这个人的核心气质（15字以内，第三人称）
3. soul_slices: 3个灵魂切片，每个包含 text（原话提炼）和 source（taste/judgment/blocker）
4. taste_tags: 3-5个标签，格式 "#xxx"
5. anti_patterns: 2-3个 TA 讨厌的事情

注意：
- soul_slices 要用第二人称（"你..."）
- 语气要像一个真正懂 TA 的朋友在描述 TA
- 不要虚、不要泛，要具体
"""

TWIN_CHAT_PROMPT = """你现在是 {user_name} 的 AI 分身，名叫 {twin_name}。

你的性格和立场：
{soul_slices}

你此次黑客松的目标：
{explore_goals}

你正在和另一个分身聊天。对方的信息：
{other_twin_info}

对话规则：
1. 用第一人称说话，就像 {user_name} 本人在说话
2. 不要装客气，直接进入实质性话题
3. 寻找共鸣点和互补点
4. 每条消息 1-3 句话，不要太长
5. 如果发现强共鸣，可以提议线下见面

当前对话：
{conversation_history}

你的回复："""

MATCH_REPORT_PROMPT = """根据两个分身的对话，生成匹配报告（严格 JSON 格式）：

分身 A：{twin_a_info}
分身 B：{twin_b_info}
对话记录：{conversation_messages}

生成：
1. match_score: 0-100 的匹配分数
2. resonance: 共鸣点描述（一两句话）
3. complement: 互补点描述（一两句话）
4. soul_slices_of_b: 从对话中提炼出的对方 3 个灵魂切片 [{text, source}]
5. why_you_two: 一段话，说明这两个人为什么值得认识
6. coffee_chat_suggestion: 建议见面时的切入角度"""


async def generate_twin(
    topic_type: str,
    topic_content: str,
    current_blocker: str | None = None,
) -> dict:
    """Generate twin personality using GLM API."""
    if not _get_glm_api_key():
        raise ValueError("GLM_API_KEY not set")

    try:
        prompt = TWIN_GENERATION_PROMPT.format(
            topic_type=topic_type,
            topic_content=topic_content,
            current_blocker=current_blocker or "未提及",
        )

        text = await _glm_chat(prompt, max_tokens=1024)
        return json.loads(_strip_json_fence(text))

    except json.JSONDecodeError:
        raise ValueError("Failed to parse AI response as JSON")
    except Exception as e:
        raise ValueError(f"AI generation failed: {e}")


async def twin_chat_turn(
    twin_name: str,
    user_name: str,
    soul_slices: list[dict],
    explore_goals: list[str],
    other_twin_info: str,
    conversation_history: str,
) -> str:
    """Generate one turn of twin-to-twin conversation."""
    if not _get_glm_api_key():
        # Fallback
        return "我觉得我们可以深入聊聊这个话题。"

    try:
        prompt = TWIN_CHAT_PROMPT.format(
            twin_name=twin_name,
            user_name=user_name,
            soul_slices=json.dumps(soul_slices, ensure_ascii=False),
            explore_goals=", ".join(explore_goals),
            other_twin_info=other_twin_info,
            conversation_history=conversation_history or "（对话刚开始）",
        )

        return await _glm_chat(prompt, max_tokens=256)

    except Exception:
        return "我们有很多可以聊的。"


async def generate_match_report(
    twin_a_info: str,
    twin_b_info: str,
    conversation_messages: str,
) -> dict:
    """Generate match report from twin conversation."""
    if not _get_glm_api_key():
        return {
            "match_score": 70,
            "resonance": "话题兴趣一致",
            "complement": "视角互补",
            "soul_slices_of_b": [],
            "why_you_two": "值得深入交流",
            "coffee_chat_suggestion": "从共同兴趣聊起",
        }

    try:
        prompt = MATCH_REPORT_PROMPT.format(
            twin_a_info=twin_a_info,
            twin_b_info=twin_b_info,
            conversation_messages=conversation_messages,
        )

        text = await _glm_chat(prompt, max_tokens=1024)
        return json.loads(_strip_json_fence(text))

    except Exception:
        return {
            "match_score": 70,
            "resonance": "话题兴趣一致",
            "complement": "视角互补",
            "soul_slices_of_b": [],
            "why_you_two": "值得深入交流",
            "coffee_chat_suggestion": "从共同兴趣聊起",
        }


def _get_glm_api_key() -> str:
    settings = get_settings()
    return settings.GLM_API_KEY or settings.ZHIPU_API_KEY


def _strip_json_fence(text: str) -> str:
    text = text.strip()
    if "```json" in text:
        return text.split("```json", 1)[1].split("```", 1)[0].strip()
    if "```" in text:
        return text.split("```", 1)[1].split("```", 1)[0].strip()
    return text


async def _glm_chat(prompt: str, max_tokens: int) -> str:
    return await asyncio.to_thread(_glm_chat_sync, prompt, max_tokens)


def _glm_chat_sync(prompt: str, max_tokens: int) -> str:
    settings = get_settings()
    api_key = _get_glm_api_key()
    base_url = settings.GLM_BASE_URL.rstrip("/")
    url = f"{base_url}/chat/completions"
    payload = {
        "model": settings.GLM_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise ValueError(f"GLM API error {exc.code}: {detail}") from exc

    try:
        return result["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError(f"Unexpected GLM response: {result}") from exc
