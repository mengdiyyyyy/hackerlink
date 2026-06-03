import jwt
import random
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from database import get_pool
from config import get_settings
import asyncpg

router = APIRouter()

NOUNS = [
    "listener", "builder", "seeker", "thinker", "maker", "dreamer",
    "observer", "coder", "hacker", "sage", "wizard", "pioneer",
    "craftsman", "explorer", "tinkerer", "architect", "detective", "oracle",
]
ADJECTIVES = [
    "deep", "radical", "quiet", "bold", "sharp", "calm",
    "swift", "wild", "bright", "subtle", "keen", "fierce",
]


def generate_codename() -> str:
    adj = random.choice(ADJECTIVES)
    noun = random.choice(NOUNS)
    num = random.randint(1, 99)
    return f"@{adj}_{noun}_{num:02d}"


def create_token(user_id: str) -> str:
    settings = get_settings()
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


class RegisterResponse(BaseModel):
    user: dict
    token: str


class RegisterRequest(BaseModel):
    codename: str | None = None
    display_name: str | None = None


@router.post("/register", response_model=RegisterResponse)
async def register(req: RegisterRequest | None = None, pool: asyncpg.Pool = Depends(get_pool)):
    requested_codename = (req.codename.strip() if req and req.codename else "")
    codename = requested_codename if requested_codename.startswith("@") else f"@{requested_codename}" if requested_codename else generate_codename()
    # Ensure unique codename
    while await pool.fetchval("SELECT id FROM users WHERE codename = $1", codename):
        if requested_codename:
            raise HTTPException(409, "Codename already exists")
        codename = generate_codename()

    avatar_variant = random.randint(1, 9)
    user_id = await pool.fetchval(
        "INSERT INTO users (codename, display_name, avatar_variant) VALUES ($1, $2, $3) RETURNING id",
        codename, req.display_name.strip() if req and req.display_name else None, avatar_variant,
    )
    token = create_token(str(user_id))
    user = {
        "id": str(user_id),
        "codename": codename,
        "display_name": req.display_name.strip() if req and req.display_name else None,
        "avatar_variant": avatar_variant,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return RegisterResponse(user=user, token=token)


class LoginRequest(BaseModel):
    codename: str


@router.post("/login")
async def login(req: LoginRequest, pool: asyncpg.Pool = Depends(get_pool)):
    row = await pool.fetchrow("SELECT * FROM users WHERE codename = $1", req.codename)
    if not row:
        raise HTTPException(404, "User not found")
    token = create_token(str(row["id"]))
    return {"user": dict(row), "token": token}


async def get_current_user(
    authorization: str | None = Header(default=None),
    pool: asyncpg.Pool = Depends(get_pool),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, get_settings().SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")

    row = await pool.fetchrow("SELECT * FROM users WHERE id = $1::uuid", user_id)
    if not row:
        raise HTTPException(401, "User not found")
    return row


@router.get("/me")
async def get_me(row=Depends(get_current_user)):
    return dict(row)
