"""
ToxicShield AI - FastAPI Backend
Main application entry point
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
import logging

from app.core.config import settings
from app.core.database import connect_db, close_db
from app.api import auth, analyze, moderation, admin, analytics
from app.core.websocket_manager import ConnectionManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ToxicShield AI API",
    description="AI-powered offensive comment detection with multilingual support",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ws_manager = ConnectionManager()

# Register routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(analyze.router, prefix="/api/v1", tags=["Analysis"])
app.include_router(moderation.router, prefix="/api/v1/moderation", tags=["Moderation"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])


@app.on_event("startup")
async def startup():
    logger.info("🛡️ ToxicShield AI starting up...")
    await connect_db()
    logger.info("✅ Database connected")


@app.on_event("shutdown")
async def shutdown():
    await close_db()
    logger.info("Database disconnected")


@app.get("/")
async def root():
    return {
        "service": "ToxicShield AI",
        "version": "2.0.0",
        "status": "operational",
        "model": "DistilBERT-ToxicClassifier-v2",
        "supported_languages": ["en", "hi", "hinglish"],
        "categories": ["toxic", "severe_toxic", "obscene", "threat", "insult", "identity_hate", "spam", "cyberbullying"],
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "database": "connected", "model": "loaded"}


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            if message.get("type") == "ping":
                await ws_manager.send_personal({"type": "pong"}, client_id)
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
