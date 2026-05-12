"""
ToxicShield AI - MongoDB Collection Schemas & Pydantic Models
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class Verdict(str, Enum):
    SAFE    = "SAFE"
    WARNING = "WARNING"
    TOXIC   = "TOXIC"


class UserRole(str, Enum):
    USER  = "user"
    ADMIN = "admin"
    MOD   = "moderator"


class UserSchema(BaseModel):
    """Collection: users"""
    username: str
    email: str
    hashed_password: str
    role: UserRole        = UserRole.USER
    is_active: bool       = True
    is_banned: bool       = False
    total_comments: int   = 0
    toxic_count: int      = 0
    blocked_count: int    = 0
    last_login: Optional[datetime] = None
    created_at: datetime  = Field(default_factory=datetime.utcnow)


class CategoryScores(BaseModel):
    toxic: float; severe_toxic: float; obscene: float
    threat: float; insult: float; identity_hate: float
    spam: float; cyberbullying: float


class TokenAttribution(BaseModel):
    word: str; score: float; risk_level: str


class CommentSchema(BaseModel):
    """Collection: comments"""
    comment_id: str
    original_text: str
    user_id: str
    username: str
    verdict: Verdict
    is_toxic: bool
    confidence: float
    categories: CategoryScores
    tokens: List[TokenAttribution] = []
    rewritten: Optional[str] = None
    language_detected: str   = "en"
    processing_time_ms: int
    model: str               = "DistilBERT-ToxicClassifier-v2"
    blocked: bool            = False
    created_at: datetime     = Field(default_factory=datetime.utcnow)


class ModerationLogSchema(BaseModel):
    """Collection: moderation_logs"""
    comment_id: str
    action: str
    action_by: str
    reason: Optional[str] = None
    original_verdict: Verdict
    created_at: datetime  = Field(default_factory=datetime.utcnow)


class ThresholdSchema(BaseModel):
    """Collection: thresholds (single doc, upserted by admin)"""
    toxic: float        = 0.50
    severe_toxic: float = 0.70
    obscene: float      = 0.55
    threat: float       = 0.60
    insult: float       = 0.55
    identity_hate: float= 0.55
    spam: float         = 0.70
    cyberbullying: float= 0.55
    auto_block: float   = 0.70
    updated_by: str     = "system"
    updated_at: datetime= Field(default_factory=datetime.utcnow)


MONGO_INDEXES = """
db = db.getSiblingDB('toxicshield');
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.comments.createIndex({ created_at: -1 });
db.comments.createIndex({ user_id: 1 });
db.comments.createIndex({ verdict: 1 });
db.comments.createIndex({ blocked: 1 });
db.moderation_logs.createIndex({ created_at: -1 });
db.moderation_logs.createIndex({ comment_id: 1 });
print('All indexes created.');
"""
