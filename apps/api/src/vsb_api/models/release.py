"""Release database models."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKeyConstraint, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from vsb_api.db import Base


class WizardRelease(Base):
    """Wizard release model - stable release pointers for deployments."""

    __tablename__ = "wizard_releases"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    # Wizard identifier
    wizard_key: Mapped[str] = mapped_column(Text, nullable=False)

    # Release environment/channel (e.g., "prod", "sandbox", "partner-x")
    release_key: Mapped[str] = mapped_column(Text, nullable=False)

    # Points to specific wizard version
    wizard_version: Mapped[str] = mapped_column(Text, nullable=False)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ['wizard_key', 'wizard_version'],
            ['wizard_definitions.wizard_key', 'wizard_definitions.version'],
            name='fk_wizard_release_definition',
        ),
        UniqueConstraint('wizard_key', 'release_key', name='uq_wizard_release_key'),
    )
