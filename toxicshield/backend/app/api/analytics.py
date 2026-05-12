"""Analytics API routes"""
from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from datetime import datetime, timedelta
import random

router = APIRouter()


@router.get("/overview")
async def analytics_overview(
    period: str = Query("7d", regex="^(24h|7d|30d|90d)$"),
    current_user: dict = Depends(get_current_user),
):
    periods = {"24h": 24, "7d": 7, "30d": 30, "90d": 90}
    n = periods[period]
    labels = [f"{i}h ago" if period == "24h" else f"Day {i+1}" for i in range(n)]
    toxic = [random.randint(20, 120) for _ in range(n)]
    safe = [random.randint(100, 500) for _ in range(n)]
    return {
        "period": period,
        "labels": labels,
        "toxic_counts": toxic,
        "safe_counts": safe,
        "total": sum(toxic) + sum(safe),
        "avg_toxicity_rate": round(sum(toxic) / (sum(toxic) + sum(safe)) * 100, 2),
    }


@router.get("/categories")
async def category_breakdown(current_user: dict = Depends(get_current_user)):
    return {
        "categories": [
            {"name": "toxic", "count": 312, "percentage": 38.1, "color": "#ff2052"},
            {"name": "insult", "count": 198, "percentage": 24.2, "color": "#ff8c00"},
            {"name": "obscene", "count": 143, "percentage": 17.5, "color": "#8b5cf6"},
            {"name": "threat", "count": 98, "percentage": 12.0, "color": "#ffd700"},
            {"name": "identity_hate", "count": 67, "percentage": 8.2, "color": "#00d4ff"},
        ]
    }


@router.get("/languages")
async def language_distribution(current_user: dict = Depends(get_current_user)):
    return {
        "languages": [
            {"language": "English", "code": "en", "count": 7834, "percentage": 62.1},
            {"language": "Hinglish", "code": "hinglish", "count": 3024, "percentage": 24.0},
            {"language": "Hindi", "code": "hi", "count": 1765, "percentage": 14.0},
        ]
    }


@router.get("/model-performance")
async def model_performance(current_user: dict = Depends(get_current_user)):
    return {
        "metrics": {
            "accuracy": 94.2,
            "precision": 91.8,
            "recall": 89.5,
            "f1_score": 90.6,
            "auc_roc": 96.3,
            "mcc": 0.87,
        },
        "training_history": {
            "epochs": list(range(1, 6)),
            "train_loss": [0.68, 0.42, 0.31, 0.24, 0.19],
            "val_loss": [0.52, 0.38, 0.29, 0.23, 0.20],
            "train_acc": [78.2, 86.4, 90.1, 92.8, 94.6],
            "val_acc": [81.3, 87.9, 91.2, 93.4, 94.2],
        },
        "dataset": {
            "name": "Jigsaw Toxic Comment Classification",
            "total_samples": 159571,
            "train_samples": 143614,
            "val_samples": 15957,
            "label_distribution": {
                "clean": 143346,
                "toxic": 15294,
                "severe_toxic": 1595,
                "obscene": 8449,
                "threat": 478,
                "insult": 7877,
                "identity_hate": 1405,
            }
        }
    }
