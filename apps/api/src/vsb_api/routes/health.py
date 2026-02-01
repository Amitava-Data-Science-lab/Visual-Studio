"""Health check endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from vsb_api.db import get_db

router = APIRouter()


@router.get("")
async def health_check() -> dict:
    """Check API health (basic)."""
    return {"status": "healthy", "service": "vsb-api"}


@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)) -> dict:
    """Check if API is ready to serve requests (includes DB connectivity)."""
    try:
        # Test database connectivity
        result = await db.execute(text("SELECT 1"))
        result.scalar()

        return {
            "status": "ready",
            "database": "connected"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "not_ready",
                "database": "disconnected",
                "error": str(e)
            }
        )


@router.get("/live")
async def liveness_check() -> dict:
    """Check if API is alive (no dependencies)."""
    return {"status": "alive"}


@router.get("/db")
async def database_health(db: AsyncSession = Depends(get_db)) -> dict:
    """Detailed database health check."""
    try:
        # Check basic connection
        await db.execute(text("SELECT 1"))

        # Check table count
        result = await db.execute(text(
            """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            """
        ))
        table_count = result.scalar()

        # Check if alembic_version table exists
        result = await db.execute(text(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'alembic_version'
            )
            """
        ))
        has_migrations = result.scalar()

        # Get current migration version if it exists
        current_version = None
        if has_migrations:
            result = await db.execute(text(
                "SELECT version_num FROM alembic_version"
            ))
            current_version = result.scalar()

        return {
            "status": "healthy",
            "connected": True,
            "tables": table_count,
            "database": "vsb",
            "migrations": {
                "initialized": has_migrations,
                "current_version": current_version
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "connected": False,
            "error": str(e)
        }
