"""MongoDB connection using Motor (async driver)"""
import motor.motor_asyncio
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

client: motor.motor_asyncio.AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    try:
        client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.DATABASE_NAME]
        # Create indexes
        await db.comments.create_index([("created_at", -1)])
        await db.comments.create_index([("user_id", 1)])
        await db.comments.create_index([("verdict", 1)])
        await db.users.create_index([("username", 1)], unique=True)
        await db.users.create_index([("email", 1)], unique=True)
        logger.info(f"Connected to MongoDB: {settings.DATABASE_NAME}")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        # Allow startup without DB for demo purposes
        db = None


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db
