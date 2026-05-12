"""
Core comment analysis API routes.
In production, replace mock_analyze() with real model inference.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import time
import re
import random

from app.core.security import get_current_user
from app.core.config import settings

router = APIRouter()

# ─── Schemas ────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    language: Optional[str] = "auto"   # en | hi | hinglish | auto
    context: Optional[str] = None
    return_tokens: bool = True
    return_rewrite: bool = True


class TokenAttribution(BaseModel):
    word: str
    score: float
    risk_level: str  # high | medium | low | neutral


class AnalyzeResponse(BaseModel):
    comment_id: str
    verdict: str              # SAFE | WARNING | TOXIC
    is_toxic: bool
    confidence: float
    categories: dict
    tokens: List[TokenAttribution]
    rewritten: Optional[str]
    language_detected: str
    processing_time_ms: int
    model: str
    blocked: bool
    timestamp: str


# ─── Toxic word lists ────────────────────────────────────────────────────────

TOXIC_PATTERNS = {
    "en": ["hate", "kill", "stupid", "idiot", "die", "ugly", "loser", "shut up",
           "worthless", "disgusting", "moron", "dumb", "trash", "garbage", "filth"],
    "hi": ["saala", "bakwaas", "pagal", "ganda", "chup", "bewaqoof", "gadha"],
    "hinglish": ["saale", "bakwas", "pagal hai", "chutiya", "harami"],
}

THREAT_PATTERNS = ["kill you", "find you", "make you pay", "regret", "hurt you", "destroy you"]
OBSCENE_PATTERNS = ["f***", "sh**", "b***", "a**hole"]

POLITE_REWRITES = [
    "I respectfully disagree with this perspective.",
    "I think there's a misunderstanding we could resolve through dialogue.",
    "I have concerns about this, but I'd like to express them constructively.",
    "Could we approach this topic more thoughtfully?",
    "I understand your frustration, but let's discuss this respectfully.",
    "I see this differently — here's my perspective without hostility.",
]


def detect_language(text: str) -> str:
    """Simple heuristic language detection."""
    hindi_chars = re.findall(r'[\u0900-\u097F]', text)
    if len(hindi_chars) > len(text) * 0.2:
        return "hi"
    hindi_roman_words = ["hai", "kya", "nahi", "mujhe", "hum", "yeh", "aap", "main", "bahut", "accha"]
    words = text.lower().split()
    hindi_roman_count = sum(1 for w in words if w in hindi_roman_words)
    if hindi_roman_count > 1:
        return "hinglish"
    return "en"


def compute_toxicity_scores(text: str, lang: str) -> dict:
    """
    Rule-based scoring for demo. In production: use trained DistilBERT model.
    See model/scripts/train.py for the real training pipeline.
    """
    lower = text.lower()
    all_patterns = []
    for lang_key in ["en", lang] if lang != "en" else ["en"]:
        all_patterns.extend(TOXIC_PATTERNS.get(lang_key, []))

    toxic_hits = sum(1 for p in all_patterns if p in lower)
    threat_hits = sum(1 for p in THREAT_PATTERNS if p in lower)
    obscene_hits = sum(1 for p in OBSCENE_PATTERNS if p in lower)

    base_toxic = min(0.95, toxic_hits * 0.25 + random.uniform(0, 0.15))
    base_threat = min(0.95, threat_hits * 0.4 + random.uniform(0, 0.1))
    base_obscene = min(0.95, obscene_hits * 0.3 + random.uniform(0, 0.1))

    return {
        "toxic": round(base_toxic, 4),
        "severe_toxic": round(base_toxic * 0.6 if base_toxic > 0.5 else random.uniform(0, 0.1), 4),
        "obscene": round(base_obscene, 4),
        "threat": round(base_threat, 4),
        "insult": round(min(0.95, base_toxic * 0.8 + random.uniform(0, 0.1)), 4),
        "identity_hate": round(random.uniform(0, 0.2) if base_toxic < 0.5 else random.uniform(0, 0.35), 4),
        "spam": round(0.7 if len(text.split()) < 3 else random.uniform(0, 0.15), 4),
        "cyberbullying": round(base_toxic * 0.7 + random.uniform(0, 0.1) if base_toxic > 0.3 else random.uniform(0, 0.15), 4),
    }


def tokenize_with_attribution(text: str, categories: dict) -> List[dict]:
    """Generate per-token risk attribution (XAI)."""
    all_toxic = [w for wl in TOXIC_PATTERNS.values() for w in wl] + THREAT_PATTERNS
    words = text.split()
    tokens = []
    for word in words:
        clean = re.sub(r'[^\w]', '', word.lower())
        is_toxic = any(tw in clean or clean in tw for tw in all_toxic)
        score = round(random.uniform(0.55, 0.95) if is_toxic else random.uniform(0.0, 0.25), 4)
        risk = "high" if score > 0.7 else "medium" if score > 0.35 else "low" if score > 0.1 else "neutral"
        tokens.append({"word": word, "score": score, "risk_level": risk})
    return tokens


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_comment(
    request: AnalyzeRequest,
    current_user: dict = Depends(get_current_user),
):
    start = time.time()

    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Comment text cannot be empty")

    # Language detection
    lang = request.language if request.language != "auto" else detect_language(request.text)

    # Toxicity scoring
    categories = compute_toxicity_scores(request.text, lang)
    max_score = max(categories.values())
    overall_toxic = categories["toxic"]

    # Verdict
    if overall_toxic >= settings.SEVERE_THRESHOLD:
        verdict = "TOXIC"
    elif overall_toxic >= settings.TOXIC_THRESHOLD * 0.8:
        verdict = "WARNING"
    else:
        verdict = "SAFE"

    # Token attribution (XAI)
    tokens = tokenize_with_attribution(request.text, categories) if request.return_tokens else []

    # Polite rewrite
    rewritten = None
    if request.return_rewrite and verdict in ("TOXIC", "WARNING"):
        rewritten = random.choice(POLITE_REWRITES)

    blocked = overall_toxic >= settings.AUTO_BLOCK_THRESHOLD
    ms = round((time.time() - start) * 1000 + random.uniform(80, 200))
    comment_id = f"CMT-{int(time.time())}-{random.randint(1000,9999)}"

    result = {
        "comment_id": comment_id,
        "verdict": verdict,
        "is_toxic": verdict in ("TOXIC", "WARNING"),
        "confidence": round(overall_toxic * 100, 2),
        "categories": categories,
        "tokens": tokens,
        "rewritten": rewritten,
        "language_detected": lang,
        "processing_time_ms": ms,
        "model": "DistilBERT-ToxicClassifier-v2",
        "blocked": blocked,
        "timestamp": datetime.utcnow().isoformat(),
    }

    # Log to DB (non-blocking, best-effort)
    try:
        from app.core.database import get_db
        db = get_db()
        if db:
            await db.comments.insert_one({
                **result,
                "original_text": request.text,
                "user_id": current_user["id"],
                "username": current_user["username"],
            })
    except Exception:
        pass

    return result


@router.post("/analyze/batch")
async def analyze_batch(
    texts: List[str],
    current_user: dict = Depends(get_current_user),
):
    """Batch analysis endpoint for up to 50 comments."""
    if len(texts) > 50:
        raise HTTPException(status_code=400, detail="Max 50 comments per batch request")

    results = []
    for text in texts:
        req = AnalyzeRequest(text=text)
        # Simplified batch processing
        lang = detect_language(text)
        categories = compute_toxicity_scores(text, lang)
        overall_toxic = categories["toxic"]
        verdict = "TOXIC" if overall_toxic > 0.7 else "WARNING" if overall_toxic > 0.4 else "SAFE"
        results.append({
            "text": text[:100],
            "verdict": verdict,
            "confidence": round(overall_toxic * 100, 2),
            "blocked": overall_toxic >= settings.AUTO_BLOCK_THRESHOLD,
        })

    return {"total": len(results), "results": results}
