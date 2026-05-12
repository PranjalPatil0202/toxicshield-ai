"""JWT authentication, password hashing, and in-memory user registry with registration support."""

from datetime import datetime, timedelta
from typing import Optional
import uuid

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings

# Use pbkdf2_sha256 instead of bcrypt
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto"
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ── In-memory user store ─────────────────────────────────────────────

USER_STORE: dict[str, dict] = {
    "admin": {
        "id": "1",
        "username": "admin",
        "email": "admin@toxicshield.ai",
        "hashed_password": pwd_context.hash("admin123"),
        "role": "admin",
        "is_active": True,
        "is_banned": False,
        "total_comments": 0,
        "toxic_count": 0,
        "created_at": "2024-01-01T00:00:00Z",
    },
    "user1": {
        "id": "2",
        "username": "user1",
        "email": "user1@example.com",
        "hashed_password": pwd_context.hash("user123"),
        "role": "user",
        "is_active": True,
        "is_banned": False,
        "total_comments": 342,
        "toxic_count": 3,
        "created_at": "2024-02-14T00:00:00Z",
    },
}

# ── Password helpers ────────────────────────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# ── Registration ────────────────────────────────────────────────────

def register_user(username: str, email: str, password: str) -> dict:
    key = username.lower()

    if key in USER_STORE:
        raise ValueError("Username already taken")

    if any(u["email"].lower() == email.lower() for u in USER_STORE.values()):
        raise ValueError("Email already registered")

    new_user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "email": email,
        "hashed_password": hash_password(password),
        "role": "user",
        "is_active": True,
        "is_banned": False,
        "total_comments": 0,
        "toxic_count": 0,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }

    USER_STORE[key] = new_user
    return new_user

# ── JWT helpers ─────────────────────────────────────────────────────

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:

    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta or
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
    except JWTError:
        return None

# ── FastAPI dependencies ────────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme)
) -> dict:

    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)

    if not payload:
        raise exc

    username = payload.get("sub", "").lower()

    user = USER_STORE.get(username)

    if not user:
        raise exc

    if not user["is_active"]:
        raise HTTPException(
            status_code=400,
            detail="Account is inactive"
        )

    if user["is_banned"]:
        raise HTTPException(
            status_code=403,
            detail="Account has been banned"
        )

    return user

async def require_admin(
    current_user: dict = Depends(get_current_user)
) -> dict:

    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user

# ── Utility helpers ─────────────────────────────────────────────────

def get_user_by_username(username: str) -> Optional[dict]:
    return USER_STORE.get(username.lower())

def get_all_users() -> list[dict]:
    return list(USER_STORE.values())