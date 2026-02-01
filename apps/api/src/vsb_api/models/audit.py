"""Audit log models."""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from sqlalchemy import DateTime, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from vsb_api.db import Base


class AuditEvent(Base):
    """Audit event model - comprehensive audit trail for all operations."""

    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    # Entity being audited
    entity_type: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )  # wizard, page, session, policy, etc.

    entity_id: Mapped[str] = mapped_column(Text, nullable=False)

    # Action taken
    action: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )  # create, update, publish, issue, retry, etc.

    # Who performed the action
    actor: Mapped[str] = mapped_column(Text, nullable=False)  # user id / system

    # Additional context
    event_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        "metadata", JSONB, nullable=True
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
