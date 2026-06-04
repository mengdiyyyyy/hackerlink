"""Load real MBA student profiles (markdown) and turn them into chat agents.

The markdown files live in ``backend/agent_profiles_md/`` (one student each).
Each file is parsed into a persona that becomes:

  * a ``users`` row   (codename + display_name + avatar)
  * a ``twins`` row   (topic / vibe / soul slices + the FULL bio as ``background``)
  * an ``event_participants`` row for the active event

The full bio is fed to the model as the agent's persona so every chat agent
"is" that real person, using their background to help solve the user's issue.
"""

import re
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import asyncpg

PROFILE_DIR = Path(__file__).resolve().parent / "agent_profiles_md"

# Conversations seeded for previous demo builds — removed so the message list
# only shows the real MBA people the user asked for.
LEGACY_DEMO_CODENAMES = ["@radical_builder_23", "@deep_observer_09", "@quiet_maker_17"]

# Fields we know how to pull out of every profile.
_KNOWN_FIELDS = [
    "Country of citizenship",
    "Place(s) where I grew up",
    "Education background",
    "Languages spoken",
    "Related industry",
    "Most recent employment",
    "Extracurricular activities",
    "Personal Background",
    "Career Progress to Date",
    "Career goals",
    "Reason(s) for doing an MBA at Tsinghua in China now",
    "The most important thing you've learned (or known) about China",
    "Any other interesting fact about yourself",
]


# --------------------------------------------------------------------------- #
# Markdown parsing
# --------------------------------------------------------------------------- #
def _parse_markdown(text: str) -> dict:
    """Split a profile into {title, name, fields{heading: body}}."""
    title = ""
    fields: dict[str, str] = {}
    current: str | None = None
    buf: list[str] = []

    def flush():
        nonlocal current, buf
        if current is not None:
            fields[current] = "\n".join(buf).strip()
        buf = []

    for line in text.splitlines():
        if line.startswith("# ") and not line.startswith("## "):
            title = line[2:].strip()
            continue
        if line.startswith("### "):
            flush()
            current = line[4:].strip()
            continue
        if line.startswith("## "):
            flush()
            current = line[3:].strip()
            continue
        if current is not None:
            buf.append(line)
    flush()

    name = (fields.get("Name") or title or "").strip()
    return {"title": title, "name": name, "fields": fields}


def _field(parsed: dict, *names: str) -> str:
    """First non-empty field body matching any of the given headings.

    Matching is tolerant of the curly-vs-straight apostrophe difference that
    shows up in headings like "you've learned".
    """
    fields = parsed["fields"]

    def norm(s: str) -> str:
        return s.replace("’", "'").strip().lower()

    wanted = [norm(n) for n in names]
    for heading, body in fields.items():
        if norm(heading) in wanted:
            cleaned = body.strip()
            if cleaned and cleaned != "（未识别到内容）":
                return cleaned
    return ""


def _latin_tokens(name: str) -> list[str]:
    # Drop parenthetical nicknames, keep latin words only.
    no_parens = re.sub(r"\([^)]*\)", " ", name)
    return re.findall(r"[A-Za-z]+", no_parens)


def _first_sentence(text: str, limit: int = 110) -> str:
    if not text:
        return ""
    # Split on the first sentence terminator (CN or EN).
    parts = re.split(r"(?<=[。.!?！？])\s*", text.strip(), maxsplit=1)
    sentence = parts[0].strip() if parts else text.strip()
    if len(sentence) > limit:
        sentence = sentence[:limit].rstrip() + "…"
    return sentence


def _short(text: str, limit: int) -> str:
    """Collapse whitespace and cap to ``limit`` characters (ellipsis included)."""
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[: max(1, limit - 1)].rstrip() + "…"


def _tags_from(industry: str, activities: str) -> list[str]:
    raw = re.split(r"[,/、;，]| and ", f"{industry},{activities}")
    tags: list[str] = []
    for t in raw:
        t = t.strip()
        if not t:
            continue
        token = re.sub(r"\s+", "", t)
        tag = "#" + token
        if tag not in tags:
            tags.append(tag)
        if len(tags) >= 5:
            break
    return tags or ["#MBA同学"]


def _avatar_variant(codename: str) -> int:
    h = int(hashlib.md5(codename.encode("utf-8")).hexdigest(), 16)
    return (h % 9) + 1


# --------------------------------------------------------------------------- #
# Persona building
# --------------------------------------------------------------------------- #
def _build_persona(parsed: dict, used_codenames: set[str]) -> dict | None:
    name = parsed["name"]
    if not name:
        return None

    tokens = _latin_tokens(name)
    slug = "_".join(t.lower() for t in tokens)[:40]
    if not slug:
        slug = "agent_" + hashlib.md5(name.encode("utf-8")).hexdigest()[:8]
    codename = "@" + slug
    n = 2
    while codename in used_codenames:
        codename = f"@{slug}_{n}"
        n += 1
    used_codenames.add(codename)

    twin_name = tokens[0].capitalize() if tokens else name.split()[0]

    citizenship = _field(parsed, "Country of citizenship")
    grew_up = _field(parsed, "Place(s) where I grew up")
    education = _field(parsed, "Education background")
    languages = _field(parsed, "Languages spoken")
    industry = _field(parsed, "Related industry")
    employment = _field(parsed, "Most recent employment")
    activities = _field(parsed, "Extracurricular activities")
    personal = _field(parsed, "Personal Background")
    progress = _field(parsed, "Career Progress to Date")
    goals = _field(parsed, "Career goals")
    mba_reason = _field(parsed, "Reason(s) for doing an MBA at Tsinghua in China now")
    china = _field(parsed, "The most important thing you've learned (or known) about China")
    fun_fact = _field(parsed, "Any other interesting fact about yourself")

    industry_main = re.split(r"[,/、，;；&]", industry)[0].strip() if industry else "创业 / 职业探索"
    topic_type = _short(industry_main, 50) or "职业探索"

    topic_content = _short(
        "；".join(filter(None, [employment and f"最近在 {employment}", _first_sentence(goals, 90)])),
        400,
    ) or _first_sentence(personal, 200)

    vibe_summary = _short(
        f"{industry_main}背景的 MBA 同学，{_first_sentence(personal or goals, 50)}",
        140,
    )

    soul_slices = [
        {"text": _short(f"做过 {industry or employment or '多个方向'}", 80), "source": "taste"},
        {"text": _short(_first_sentence(goals, 90) or "想把经验变成真正的产品", 100), "source": "judgment"},
        {"text": _short(_first_sentence(fun_fact or activities, 80) or "热爱探索新事物", 100), "source": "blocker"},
    ]

    taste_tags = _tags_from(industry, activities)
    system_tags = ["#MBA同学", "#可深聊", "#愿意分享经验"]
    anti_patterns = ["空泛的客套", "没有下一步的交流"]

    # The full bio handed to the model as this agent's persona.
    background = _compose_background(
        name=name,
        citizenship=citizenship,
        grew_up=grew_up,
        education=education,
        languages=languages,
        industry=industry,
        employment=employment,
        activities=activities,
        personal=personal,
        progress=progress,
        goals=goals,
        mba_reason=mba_reason,
        china=china,
        fun_fact=fun_fact,
    )

    return {
        "codename": codename,
        "display_name": _short(name, 100),
        "twin_name": _short(twin_name, 50),
        "avatar_variant": _avatar_variant(codename),
        "topic_type": topic_type,
        "topic_content": topic_content,
        "current_blocker": _short(_first_sentence(goals, 90) or "在寻找下一步方向", 400),
        "vibe_summary": vibe_summary,
        "vibe_profile": _short(personal or goals, 400),
        "soul_slices": soul_slices,
        "taste_tags": taste_tags,
        "system_tags": system_tags,
        "anti_patterns": anti_patterns,
        "background": background,
    }


def _compose_background(**f) -> str:
    rows = [
        ("姓名", f.get("name")),
        ("国籍", f.get("citizenship")),
        ("成长地", f.get("grew_up")),
        ("教育背景", f.get("education")),
        ("语言", f.get("languages")),
        ("相关行业", f.get("industry")),
        ("最近的工作", f.get("employment")),
        ("课外 / 兴趣", f.get("activities")),
        ("个人背景", f.get("personal")),
        ("职业经历", f.get("progress")),
        ("职业目标", f.get("goals")),
        ("读 MBA 的原因", f.get("mba_reason")),
        ("对中国的观察", f.get("china")),
        ("有趣的事", f.get("fun_fact")),
    ]
    lines = [f"- {label}：{value.strip()}" for label, value in rows if value and value.strip()]
    return "\n".join(lines)


@lru_cache(maxsize=1)
def load_agents() -> list[dict]:
    """Parse every profile markdown into a persona (cached for the process)."""
    if not PROFILE_DIR.exists():
        return []
    used: set[str] = set()
    agents: list[dict] = []
    for path in sorted(PROFILE_DIR.glob("*.md")):
        try:
            parsed = _parse_markdown(path.read_text(encoding="utf-8"))
        except Exception as exc:  # pragma: no cover - skip unreadable files
            print(f"[agent_profiles] skip {path.name}: {exc}")
            continue
        persona = _build_persona(parsed, used)
        if persona:
            agents.append(persona)
    return agents


def agent_codenames() -> list[str]:
    return [a["codename"] for a in load_agents()]


# --------------------------------------------------------------------------- #
# Seeding
# --------------------------------------------------------------------------- #
_seeded_process = False


async def _purge_legacy_demo(pool: asyncpg.Pool) -> None:
    """Remove the old hard-coded demo accounts (Brian/Nova/Lin) entirely so the
    app only contains the real MBA-profile people."""
    rows = await pool.fetch(
        "SELECT id FROM users WHERE codename = ANY($1::text[])", LEGACY_DEMO_CODENAMES
    )
    ids = [r["id"] for r in rows]
    if not ids:
        return
    twin_rows = await pool.fetch("SELECT id FROM twins WHERE user_id = ANY($1::uuid[])", ids)
    twin_ids = [r["id"] for r in twin_rows]
    await pool.execute(
        "DELETE FROM user_conversations WHERE user_a_id = ANY($1::uuid[]) OR user_b_id = ANY($1::uuid[])",
        ids,
    )
    if twin_ids:
        await pool.execute(
            "DELETE FROM twin_conversations WHERE twin_a_id = ANY($1::uuid[]) OR twin_b_id = ANY($1::uuid[])",
            twin_ids,
        )
    await pool.execute("DELETE FROM event_participants WHERE user_id = ANY($1::uuid[])", ids)
    await pool.execute("DELETE FROM twins WHERE user_id = ANY($1::uuid[])", ids)
    await pool.execute("DELETE FROM users WHERE id = ANY($1::uuid[])", ids)


async def ensure_agents(pool: asyncpg.Pool, event_id: str, force: bool = False) -> None:
    """Idempotently upsert all profile agents (user + twin + participant)."""
    global _seeded_process
    if _seeded_process and not force:
        return

    try:
        await _purge_legacy_demo(pool)
    except Exception as exc:  # best-effort cleanup
        print(f"[agent_profiles] legacy purge skipped: {exc}")

    for a in load_agents():
        user_id = await pool.fetchval(
            """INSERT INTO users (codename, display_name, avatar_variant)
            VALUES ($1, $2, $3)
            ON CONFLICT (codename) DO UPDATE SET
              display_name = EXCLUDED.display_name,
              avatar_variant = EXCLUDED.avatar_variant
            RETURNING id""",
            a["codename"], a["display_name"], a["avatar_variant"],
        )
        twin_id = await pool.fetchval(
            """INSERT INTO twins (
              user_id, name, topic_type, topic_content, current_blocker,
              vibe_summary, vibe_profile, soul_slices, taste_tags, system_tags,
              anti_patterns, background
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12)
            ON CONFLICT (user_id) DO UPDATE SET
              name = EXCLUDED.name,
              topic_type = EXCLUDED.topic_type,
              topic_content = EXCLUDED.topic_content,
              current_blocker = EXCLUDED.current_blocker,
              vibe_summary = EXCLUDED.vibe_summary,
              vibe_profile = EXCLUDED.vibe_profile,
              soul_slices = EXCLUDED.soul_slices,
              taste_tags = EXCLUDED.taste_tags,
              system_tags = EXCLUDED.system_tags,
              anti_patterns = EXCLUDED.anti_patterns,
              background = EXCLUDED.background,
              updated_at = NOW()
            RETURNING id""",
            user_id, a["twin_name"], a["topic_type"], a["topic_content"],
            a["current_blocker"], a["vibe_summary"], a["vibe_profile"],
            json.dumps(a["soul_slices"]), a["taste_tags"], a["system_tags"],
            a["anti_patterns"], a["background"],
        )
        await pool.execute(
            """INSERT INTO event_participants (event_id, user_id, twin_id, explore_goals, custom_goal)
            VALUES ($1::uuid, $2, $3, $4, $5)
            ON CONFLICT (event_id, user_id) DO NOTHING""",
            event_id, user_id, twin_id,
            ["帮你把问题拆解清楚", "分享真实的经验"], "MBA profile agent",
        )

    _seeded_process = True


if __name__ == "__main__":
    import sys

    agents = load_agents()
    out = sys.stdout
    out.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    print(f"parsed {len(agents)} agents\n")
    for a in agents:
        print(a["codename"], "|", a["display_name"], "|", a["twin_name"],
              "| avatar", a["avatar_variant"], "| topic:", a["topic_type"])
    print("\n--- sample persona ---")
    sample = agents[0]
    for k in ("codename", "display_name", "vibe_summary", "taste_tags", "soul_slices"):
        print(k, "=", sample[k])
    print("\n--- sample background ---")
    print(sample["background"])
