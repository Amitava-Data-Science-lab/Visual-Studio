"""Database initialization utilities."""

from sqlalchemy import text

from vsb_api.db import Base, engine


async def create_tables() -> None:
    """Create all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def create_indexes() -> None:
    """Create performance indexes."""
    async with engine.begin() as conn:
        # Wizard definitions indexes
        await conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_wizard_definitions_key_status
                ON wizard_definitions (wizard_key, status)
                """
            )
        )

        # Page definitions indexes
        await conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_page_definitions_key_status
                ON page_definitions (page_key, status)
                """
            )
        )

        # Wizard sessions indexes
        await conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_sessions_wizard
                ON wizard_sessions (wizard_key, wizard_version)
                """
            )
        )

        await conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_sessions_partner_order
                ON wizard_sessions (partner_id, merchant_order_id)
                """
            )
        )

        # Audit events indexes
        await conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_audit_events_entity
                ON audit_events (entity_type, entity_id)
                """
            )
        )

        await conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_audit_events_created_at
                ON audit_events (created_at DESC)
                """
            )
        )


async def init_database() -> None:
    """Initialize database: Run this only for development.

    For production, use Alembic migrations:
        alembic upgrade head
    """
    print("WARNING: Running development schema creation")
    print("WARNING: For production, use: alembic upgrade head")
    print("")

    print("Creating database tables...")
    await create_tables()
    print("[OK] Tables created")

    print("Creating indexes...")
    await create_indexes()
    print("[OK] Indexes created")

    print("[OK] Database initialization complete (dev mode)")


async def drop_all() -> None:
    """Drop all database tables (DANGEROUS - use only for development)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("[OK] All tables dropped")


if __name__ == "__main__":
    import asyncio

    print("=== Visual Studio Builder - Database Initialization ===\n")
    asyncio.run(init_database())
