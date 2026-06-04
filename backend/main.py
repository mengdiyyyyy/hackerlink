from datetime import datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from config import get_settings
from database import get_pool, close_pool
from init_db import init_db
from redis_client import get_redis, close_redis
from routers import auth, twins, events, explore, conversations, meetings, network


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup. Postgres/Redis are best-effort so a missing service does not
    # stop the server from booting (DB-backed routes will simply error).
    try:
        pool = await get_pool()
        await init_db(pool)
    except Exception as exc:
        print(f"[startup] WARNING: Postgres unavailable, DB routes disabled: {exc}")
    try:
        await get_redis()
    except Exception as exc:
        print(f"[startup] WARNING: Redis unavailable: {exc}")
    yield
    # Shutdown
    await close_pool()
    await close_redis()


app = FastAPI(
    title="HackerLink API",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(twins.router, prefix="/api/twin", tags=["twins"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(explore.router, prefix="/api/explore", tags=["explore"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["meetings"])
app.include_router(network.router, prefix="/api/network", tags=["network"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="frontend-assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        requested_file = FRONTEND_DIST / full_path
        if requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(FRONTEND_DIST / "index.html")
