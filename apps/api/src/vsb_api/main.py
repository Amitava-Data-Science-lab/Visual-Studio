"""FastAPI application entry point."""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from vsb_api.config import settings
from vsb_api.routes.health import router as health_router
from vsb_api.routes.wizards import router as wizards_router
from vsb_api.routes.pages import router as pages_router
from vsb_api.routes.runtime import router as runtime_router

app = FastAPI(
    title="Visual Studio Builder API",
    description="API for managing and serving schema-driven wizards",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/health", tags=["health"])
app.include_router(wizards_router, prefix="/api/wizards", tags=["wizards"])
app.include_router(pages_router, prefix="/api/pages", tags=["pages"])
app.include_router(runtime_router, prefix="/api/embedded", tags=["runtime"])


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize application on startup."""
    if settings.dev_mode:
        from vsb_api.db_init import init_database
        await init_database()
    else:
        from vsb_api.db_migrations import check_migrations
        status = await check_migrations()
        if status["status"] == "no_migrations":
            print("WARNING: No migrations detected!")
            print("WARNING: Run: alembic upgrade head")
        else:
            print(f"[OK] Database migrations: {status['current_revision']}")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Cleanup on shutdown."""
    pass


def run() -> None:
    """Run the application using uvicorn."""
    uvicorn.run(
        "vsb_api.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )


if __name__ == "__main__":
    run()
