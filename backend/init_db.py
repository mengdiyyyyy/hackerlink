from pathlib import Path

import asyncpg


# Idempotent migrations applied on every startup so existing deployments
# pick up new columns without a full reset.
MIGRATIONS = [
    "ALTER TABLE twins ADD COLUMN IF NOT EXISTS vibe_profile TEXT",
    "ALTER TABLE twins ADD COLUMN IF NOT EXISTS system_tags TEXT[] DEFAULT '{}'",
    # Full real-person bio used as the chat agent's persona.
    "ALTER TABLE twins ADD COLUMN IF NOT EXISTS background TEXT",
]


async def init_db(pool: asyncpg.Pool) -> None:
    """Initialize the database on a fresh deployment and apply migrations."""
    async with pool.acquire() as conn:
        existing = await conn.fetchval("SELECT to_regclass('public.users')")
        if not existing:
            schema_path = Path(__file__).with_name("schema.sql")
            await conn.execute(schema_path.read_text())

        for migration in MIGRATIONS:
            await conn.execute(migration)

    # Seed the real MBA-profile agents into the active event so every user
    # sees them as chat threads. Best-effort: never block startup.
    try:
        from agent_profiles import ensure_agents

        event_id = await pool.fetchval(
            "SELECT id FROM events WHERE status = 'active' ORDER BY date DESC LIMIT 1"
        )
        if event_id:
            await ensure_agents(pool, str(event_id))
    except Exception as exc:
        print(f"[init_db] agent seed skipped: {exc}")
