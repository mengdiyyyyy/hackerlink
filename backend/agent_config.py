"""Agent background / instructions and system-prompt builder.

WHERE TO STEER THE AGENT
------------------------
The "background" is what directs every chat agent. It is resolved at request
time in this order (first non-empty wins):

  1. Environment variable  AGENT_BACKGROUND   (great for Docker: -e AGENT_BACKGROUND="...")
  2. File                  backend/agent_instructions.md   (edit this file to steer)
  3. The DEFAULT_AGENT_BACKGROUND constant below

So you can change the agent's direction without touching code by editing
`agent_instructions.md`, or without a rebuild by passing the AGENT_BACKGROUND env.
"""

import os
from pathlib import Path

DEFAULT_AGENT_BACKGROUND = """你是 HackerLink 黑客松里的一个“问题拆解伙伴”。
你唯一的目标：帮助用户把 TA 当前面临的问题，一步一步地解决掉。

工作方式：
1. 先从【用户档案】里理解 TA 的方向和当前卡点。
2. 每次只聚焦一个点，用具体的问题追问细节，把模糊的问题逐步问清楚。
3. 问清楚之后，给出具体、可执行的下一步建议，而不是空泛的大道理。
4. 一步步推进，直到用户的问题被拆解清楚、并且有明确的行动方案。

风格：
- 用中文，第一人称，像一个懂行、直接的朋友。
- 简洁，每次回复控制在 1-4 句话，不要长篇大论。
- 多问“为什么 / 具体是怎样 / 你试过什么”，少说正确的废话。
"""


def get_agent_background() -> str:
    """Resolve the agent background from env -> file -> default."""
    env = os.environ.get("AGENT_BACKGROUND")
    if env and env.strip():
        return env.strip()

    file_path = Path(__file__).resolve().parent / "agent_instructions.md"
    try:
        if file_path.exists():
            text = file_path.read_text(encoding="utf-8").strip()
            if text:
                return text
    except Exception:
        pass

    return DEFAULT_AGENT_BACKGROUND


def _fmt_list(items) -> str:
    items = [str(x) for x in (items or []) if str(x).strip()]
    return "、".join(items) if items else "（暂无）"


def _fmt_slices(slices) -> str:
    if not slices:
        return "（暂无）"
    parts = []
    for s in slices:
        if isinstance(s, dict):
            text = s.get("text", "")
            source = s.get("source", "")
            parts.append(f"{text}（{source}）" if source else text)
        else:
            parts.append(str(s))
    return "；".join(p for p in parts if p) or "（暂无）"


def _user_block(p: dict | None) -> str:
    if not p:
        return "（用户还没有填写注册信息，请在对话中主动了解 TA 的方向和卡点。）"
    name = p.get("display_name") or p.get("codename") or "用户"
    return (
        f"姓名/代号：{name}\n"
        f"关注方向：{p.get('topic_type') or '（未填）'}\n"
        f"具体想法：{p.get('topic_content') or '（未填）'}\n"
        f"当前最大的卡点：{p.get('current_blocker') or '（未填）'}\n"
        f"气质画像：{p.get('vibe_summary') or '（未填）'}\n"
        f"灵魂切片：{_fmt_slices(p.get('soul_slices'))}\n"
        f"标签：{_fmt_list(p.get('taste_tags'))}\n"
        f"讨厌：{_fmt_list(p.get('anti_patterns'))}"
    )


def _peer_block(p: dict | None) -> str | None:
    if not p:
        return None
    name = p.get("name") or p.get("display_name") or "一位参会者"
    display = p.get("display_name")
    header = f"{name}（{display}）" if display and display != name else name
    block = (
        f"你扮演的身份：{header}\n"
        f"你的方向：{p.get('topic_type') or '（未填）'}\n"
        f"你在做的事：{p.get('topic_content') or '（未填）'}\n"
        f"你的气质：{p.get('vibe_summary') or '（未填）'}\n"
        f"你的标签：{_fmt_list(p.get('taste_tags'))}"
    )
    background = (p.get("background") or "").strip()
    if background:
        block += (
            "\n你的真实背景（用第一人称代入，可以自然地引用其中的经历来帮用户）：\n"
            + background
        )
    return block


def _issue_text(p: dict | None) -> str:
    """The concrete problem the user wants solved (from registration)."""
    if not p:
        return "（用户还没有填写注册问题，请在对话里主动了解 TA 想解决什么。）"
    parts = []
    if p.get("current_blocker"):
        parts.append(f"当前最大的卡点：{p['current_blocker']}")
    if p.get("topic_content"):
        parts.append(f"具体想做的事：{p['topic_content']}")
    if p.get("topic_type"):
        parts.append(f"方向：{p['topic_type']}")
    return "\n".join(parts) or "TA 想在这场活动里找到能帮自己推进的人。"


def build_system_prompt(
    agent_background: str,
    user_profile: dict | None = None,
    peer_profile: dict | None = None,
) -> str:
    """Assemble the full system prompt: background + user context + peer persona."""
    sections = [agent_background.strip()]

    sections.append("== 你正在帮助的用户（注册时填写的信息）==\n" + _user_block(user_profile))

    peer = _peer_block(peer_profile)
    if peer:
        sections.append(
            "== 你的人设（你在这场对话里扮演的连接人，用这个身份和语气说话）==\n"
            + peer
            + "\n\n注意：你用这个身份的口吻说话，但你的核心目标始终是帮上面的用户把 TA 的问题一步步解决。"
        )

    sections.append(
        "== 对话要求 ==\n"
        "- 紧扣用户的卡点，一步步追问细节、逐步推进。\n"
        "- 每次只问 / 解决一个点，并给出具体可执行的建议。\n"
        "- 用中文，第一人称，简洁（1-4 句）。"
    )

    return "\n\n".join(sections)


def build_user_proxy_system_prompt(
    user_profile: dict | None = None,
    peer_profile: dict | None = None,
) -> str:
    """System prompt for the LLM that role-plays the USER in an auto chat.

    Its job is to drive the conversation toward solving the user's registered
    problem, and to clearly confirm once the problem is actually solved.
    """
    peer_name = (peer_profile or {}).get("name") or "一位 MBA 同学"
    return (
        f"你现在要扮演下面这位用户本人，用第一人称和 {peer_name} 对话。\n"
        "你唯一的目标：把你下面这个真实问题，通过这次对话一步步解决掉。\n\n"
        "== 你（用户）的情况 ==\n" + _user_block(user_profile) + "\n\n"
        "== 你这次要解决的问题 ==\n" + _issue_text(user_profile) + "\n\n"
        "说话方式：\n"
        "- 用中文，第一人称，像真人发消息，每次 1-3 句，口语、具体。\n"
        "- 紧扣你要解决的问题：主动补充细节、回答对方的追问、说出你的顾虑。\n"
        "- 你是来求助和确认方案的一方，不要反过来替对方出主意。\n"
        "- 当对方的建议已经足够具体、可执行，并且确实解决了你的问题时，"
        "明确说一句确认的话（如「这个方案我清楚了，就这么推进，谢谢」）。"
        "如果还没解决，就继续追问，或说清楚哪里还不明白。\n"
        "- 绝对不要说自己是 AI 或在扮演。"
    )


def build_judge_prompt(user_profile: dict | None, transcript_text: str) -> str:
    """Prompt for the LLM judge that confirms whether the issue is solved."""
    return (
        "你是一个严格的对话评审。判断下面这段对话是否已经【真正解决】了用户最初的问题。\n\n"
        "用户最初要解决的问题：\n" + _issue_text(user_profile) + "\n\n"
        "判定 solved=true 必须同时满足：\n"
        "1. 对方（MBA 同学）给出了具体、可执行的建议或下一步方案，而不是泛泛而谈；\n"
        "2. 这些建议确实针对用户的问题，没有跑题；\n"
        "3. 用户在对话里已明确表示理解 / 接受 / 确认（如“清楚了”“谢谢”“就这么办”）。\n"
        "只要还在追问、还在澄清、或方案仍然空泛，就判 solved=false。\n\n"
        "对话记录：\n" + transcript_text + "\n\n"
        "只输出严格 JSON，不要任何多余文字：\n"
        '{"solved": true 或 false, "reason": "一句话中文依据"}'
    )
