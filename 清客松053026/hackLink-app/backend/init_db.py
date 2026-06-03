from pathlib import Path

import asyncpg


async def init_db(pool: asyncpg.Pool) -> None:
    """Initialize the database once on a fresh deployment."""
    async with pool.acquire() as conn:
        existing = await conn.fetchval("SELECT to_regclass('public.users')")
        if existing:
            return

        schema_path = Path(__file__).with_name("schema.sql")
        await conn.execute(schema_path.read_text())
