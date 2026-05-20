import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

# Load .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

Base = declarative_base()

# ✅ Handle missing DB safely
if not DATABASE_URL:
    print("WARNING: DATABASE_URL not found -> Running without database")
    engine = None
    AsyncSessionLocal = None
else:
    try:
        engine = create_async_engine(DATABASE_URL, echo=True)

        AsyncSessionLocal = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

        print("SUCCESS: Database engine created successfully")

    except Exception as e:
        print("ERROR creating database engine:", e)
        engine = None
        AsyncSessionLocal = None


# Dependency (safe)
async def get_db():
    if AsyncSessionLocal is None:
        raise Exception("❌ Database is not configured")

    async with AsyncSessionLocal() as session:
        yield session