"""Application configuration using Pydantic Settings"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ToxicShield AI"
    VERSION: str = "2.0.0"
    DEBUG: bool = False

    # Database
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "toxicshield"

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Model
    MODEL_NAME: str = "distilbert-base-uncased"
    MODEL_PATH: str = "./model/saved_model"
    MAX_SEQ_LENGTH: int = 256
    BATCH_SIZE: int = 32

    # Detection thresholds
    TOXIC_THRESHOLD: float = 0.5
    SEVERE_THRESHOLD: float = 0.7
    AUTO_BLOCK_THRESHOLD: float = 0.7

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
