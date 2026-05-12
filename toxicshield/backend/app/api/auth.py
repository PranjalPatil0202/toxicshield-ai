"""Authentication API — login, register, me, logout."""
import re
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, field_validator, model_validator
from app.core.security import (
    USER_STORE, verify_password, create_access_token,
    get_current_user, register_user,
)

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    confirm_password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 30:
            raise ValueError("Username must be 30 characters or fewer")
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("Username may only contain letters, numbers, and underscores")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Invalid email address")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


def _public_user(user: dict) -> dict:
    """Strip hashed_password before returning to client."""
    return {k: v for k, v in user.items() if k != "hashed_password"}


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/login")
async def login(request: LoginRequest):
    user = USER_STORE.get(request.username.lower())
    if not user or not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if user.get("is_banned"):
        raise HTTPException(status_code=403, detail="This account has been banned")
    if not user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Account is inactive")

    token = create_access_token({"sub": user["username"].lower(), "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    try:
        new_user = register_user(request.username, request.email, request.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    token = create_access_token({"sub": new_user["username"].lower(), "role": new_user["role"]})
    return {
        "message": "Account created successfully",
        "access_token": token,
        "token_type": "bearer",
        "user": _public_user(new_user),
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return _public_user(current_user)


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    # Production: add token to a Redis blocklist here
    return {"message": "Logged out successfully"}
