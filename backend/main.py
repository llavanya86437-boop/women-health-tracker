from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import contextlib

from database.db import engine, Base

from routes import (
    user_routes,
    ai_routes,
    pregnancy_routes,
)

# ---------------- DATABASE LIFESPAN ----------------
@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        print("SUCCESS: Database connected successfully")

    except Exception as e:
        print("ERROR: Database connection failed:", e)

    yield

    await engine.dispose()


# ---------------- FASTAPI APP ----------------
app = FastAPI(
    title="FastAPI Supabase CRUD API",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------- CORS FIX ----------------
app.add_middleware(
    CORSMiddleware,

    # ✅ ALLOW FRONTEND PORTS
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
        "http://localhost:8084",
        "http://localhost:8085",
        "http://localhost:8086",
        "http://localhost:8087",
        "http://localhost:8088",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8087",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- ROUTES ----------------
app.include_router(user_routes.router)
app.include_router(ai_routes.router)
app.include_router(pregnancy_routes.router)

# ---------------- ROOT ROUTE ----------------
@app.get("/")
async def root():
    return {
        "message": "Backend running successfully"
    }


# ---------------- RUN SERVER ----------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )