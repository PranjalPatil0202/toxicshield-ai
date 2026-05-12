"""Moderation logs API"""
from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from datetime import datetime
import random

router = APIRouter()

# Mock log data generator
def generate_mock_logs(n=20):
    verdicts = ["SAFE", "TOXIC", "WARNING"]
    categories = ["toxic","insult","threat","obscene","spam","identity_hate","cyberbullying"]
    langs = ["en","hi","hinglish"]
    texts = [
        "You are an idiot", "Great job!", "I hate you",
        "Good work on this", "Shut up", "Kya bakwaas hai yeh",
        "Excellent article", "Go away nobody likes you"
    ]
    logs = []
    for i in range(n):
        v = random.choice(verdicts)
        score = random.uniform(0.7,0.95) if v == "TOXIC" else (random.uniform(0.4,0.69) if v == "WARNING" else random.uniform(0.0,0.39))
        logs.append({
            "id": f"LOG-{10000+i}",
            "text": random.choice(texts),
            "verdict": v,
            "confidence": round(score * 100, 2),
            "category": random.choice(categories) if v != "SAFE" else "-",
            "user": f"user_{random.randint(100,999)}",
            "language": random.choice(langs),
            "blocked": score >= 0.7,
            "timestamp": datetime.utcnow().isoformat(),
        })
    return logs


@router.get("/logs")
async def get_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    verdict: str = Query("all"),
    language: str = Query("all"),
    current_user: dict = Depends(get_current_user),
):
    logs = generate_mock_logs(50)
    if verdict != "all":
        logs = [l for l in logs if l["verdict"].lower() == verdict.lower()]
    if language != "all":
        logs = [l for l in logs if l["language"] == language]
    total = len(logs)
    start = (page - 1) * limit
    return {
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "logs": logs[start:start+limit],
    }


@router.get("/stats")
async def get_moderation_stats(current_user: dict = Depends(get_current_user)):
    return {
        "total_analyzed": 12847,
        "toxic_detected": 1832,
        "auto_blocked": 915,
        "safe_comments": 10921,
        "toxicity_rate": 14.3,
        "avg_confidence": 87.4,
        "model_accuracy": 94.2,
        "categories": {
            "toxic": 312, "insult": 198, "obscene": 143,
            "threat": 98, "identity_hate": 67, "spam": 28, "cyberbullying": 156
        }
    }
