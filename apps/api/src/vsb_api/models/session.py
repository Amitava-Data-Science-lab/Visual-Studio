"""Session database models."""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from vsb_api.db import Base


class WizardSession(Base):
    """Wizard session model - tracks user journey through a wizard."""

    __tablename__ = "wizard_sessions"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    # Wizard reference
    wizard_key: Mapped[str] = mapped_column(Text, nullable=False)
    wizard_version: Mapped[str] = mapped_column(Text, nullable=False)

    # Partner/merchant context
    partner_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    merchant_order_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Session status
    status: Mapped[str] = mapped_column(Text, nullable=False, default="started")

    # Application data model (mutable)
    state: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    # Current step in wizard (nullable for new sessions)
    current_step: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    quotes: Mapped[list["Quote"]] = relationship(
        "Quote",
        back_populates="session",
        cascade="all, delete-orphan",
    )
    policies: Mapped[list["Policy"]] = relationship(
        "Policy",
        back_populates="session",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint(
            """status IN (
                'started',
                'quoted',
                'selected',
                'kyc_passed',
                'accepted',
                'paid',
                'issued',
                'completed',
                'failed'
            )""",
            name="wizard_sessions_status_check",
        ),
        ForeignKeyConstraint(
            ['wizard_key', 'wizard_version'],
            ['wizard_definitions.wizard_key', 'wizard_definitions.version'],
            name='fk_session_wizard_definition',
        ),
    )


class Quote(Base):
    """Quote model - stores insurance quotes for a session."""

    __tablename__ = "quotes"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    # Session reference
    session_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("wizard_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Insurer quote reference
    quote_id: Mapped[str] = mapped_column(Text, nullable=False)

    # Full quote response
    payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)

    # Selection flag
    selected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationship
    session: Mapped["WizardSession"] = relationship("WizardSession", back_populates="quotes")


class Policy(Base):
    """Policy model - stores issued insurance policies."""

    __tablename__ = "policies"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    # Session reference
    session_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("wizard_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Policy details
    policy_number: Mapped[str] = mapped_column(Text, nullable=False)
    insurer: Mapped[str] = mapped_column(Text, nullable=False)

    # Full issuance response
    payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationship
    session: Mapped["WizardSession"] = relationship("WizardSession", back_populates="policies")
