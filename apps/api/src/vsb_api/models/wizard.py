"""Wizard database models."""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKeyConstraint, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from vsb_api.db import Base


class WizardDefinition(Base):
    """Wizard definition model - versioned and immutable when published."""

    __tablename__ = "wizard_definitions"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    # Stable identifier (e.g., "travel-embedded-uk")
    wizard_key: Mapped[str] = mapped_column(Text, nullable=False)

    # Version (e.g., "v1", "v2", "draft")
    version: Mapped[str] = mapped_column(Text, nullable=False)

    # Status
    status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="draft",
    )

    # Schema version (e.g., "wizard.v1")
    schema_version: Mapped[str] = mapped_column(Text, nullable=False, default="wizard.v1")

    # WizardDefinition JSON
    definition: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)

    # Immutability protection
    checksum: Mapped[str] = mapped_column(Text, nullable=False)

    # Audit fields
    created_by: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'published', 'deprecated')",
            name="wizard_definitions_status_check",
        ),
        UniqueConstraint('wizard_key', 'version', name='uq_wizard_key_version'),
    )
