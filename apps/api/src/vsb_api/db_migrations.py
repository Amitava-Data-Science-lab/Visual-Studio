"""Database migration utilities."""

from sqlalchemy import text

from vsb_api.db import engine


async def check_migrations() -> dict:
    """Check if migrations are up to date.

    Returns:
        dict: Migration status information
    """
    async with engine.begin() as conn:
        # Check if alembic_version table exists
        result = await conn.execute(text(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'alembic_version'
            )
            """
        ))
        has_alembic = result.scalar()

        if not has_alembic:
            return {
                "status": "no_migrations",
                "message": "Alembic not initialized. Run: alembic upgrade head"
            }

        # Get current revision
        result = await conn.execute(text(
            "SELECT version_num FROM alembic_version"
        ))
        current = result.scalar()

        return {
            "status": "ok",
            "current_revision": current
        }


async def get_migration_info() -> dict:
    """Get detailed migration information.

    Returns:
        dict: Detailed migration status
    """
    async with engine.begin() as conn:
        # Check if alembic_version exists
        result = await conn.execute(text(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'alembic_version'
            )
            """
        ))
        has_migrations = result.scalar()

        # Count total tables
        result = await conn.execute(text(
            """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            """
        ))
        table_count = result.scalar()

        info = {
            "migrations_initialized": has_migrations,
            "total_tables": table_count,
        }

        if has_migrations:
            result = await conn.execute(text(
                "SELECT version_num FROM alembic_version"
            ))
            info["current_version"] = result.scalar()

        return info
