"""Admin API routes."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import require_admin, get_all_users, USER_STORE

router = APIRouter()


class ThresholdUpdate(BaseModel):
    toxic: float = 0.5
    severe_toxic: float = 0.7
    threat: float = 0.6
    spam: float = 0.7
    cyberbullying: float = 0.55


@router.get("/users")
async def list_users(admin: dict = Depends(require_admin)):
    users = [
        {k: v for k, v in u.items() if k != "hashed_password"}
        for u in get_all_users()
    ]
    return {"users": users, "total": len(users)}


@router.put("/users/{username}/ban")
async def ban_user(username: str, admin: dict = Depends(require_admin)):
    key = username.lower()
    user = USER_STORE.get(key)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["role"] == "admin":
        raise HTTPException(status_code=400, detail="Cannot ban admin users")
    USER_STORE[key]["is_banned"] = True
    USER_STORE[key]["is_active"] = False
    return {"message": f"User '{username}' has been banned"}


@router.put("/users/{username}/unban")
async def unban_user(username: str, admin: dict = Depends(require_admin)):
    key = username.lower()
    user = USER_STORE.get(key)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    USER_STORE[key]["is_banned"] = False
    USER_STORE[key]["is_active"] = True
    return {"message": f"User '{username}' has been unbanned"}


@router.delete("/users/{username}")
async def delete_user(username: str, admin: dict = Depends(require_admin)):
    key = username.lower()
    if key not in USER_STORE:
        raise HTTPException(status_code=404, detail="User not found")
    if USER_STORE[key]["role"] == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin accounts")
    del USER_STORE[key]
    return {"message": f"User '{username}' deleted"}


@router.put("/thresholds")
async def update_thresholds(thresholds: ThresholdUpdate, admin: dict = Depends(require_admin)):
    return {"message": "Thresholds updated", "thresholds": thresholds.model_dump()}


@router.get("/system-stats")
async def system_stats(admin: dict = Depends(require_admin)):
    return {
        "model": "DistilBERT-ToxicClassifier-v2",
        "model_loaded": True,
        "uptime_hours": 72.4,
        "total_users": len(USER_STORE),
        "active_websocket_connections": 3,
        "requests_today": 8234,
        "avg_latency_ms": 142,
        "memory_usage_mb": 1843,
        "gpu_available": False,
    }
