"""Runtime/embedded endpoints for wizard execution."""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vsb_api.db import get_db
from vsb_api.models.wizard import WizardDefinition
from vsb_api.models.page import PageDefinition
from vsb_api.models.release import WizardRelease
from vsb_api.models.session import WizardSession

router = APIRouter()


# Request/Response schemas for /api/embedded/sessions
class SessionStateSchema(BaseModel):
    """State wrapper with application and context."""
    application: Dict[str, Any] = {}
    context: Dict[str, Any] = {}


class SessionCreateRequest(BaseModel):
    """Request schema for creating a session."""
    wizard_key: str  # Not wizard_id
    wizard_version: str  # String not int ("v1", "v2", "draft")
    state: Optional[SessionStateSchema] = None  # Not prefill_data


class SessionUpdateRequest(BaseModel):
    """Request schema for updating a session (PATCH)."""
    state: SessionStateSchema
    current_step: Optional[str] = None


class SessionResponse(BaseModel):
    """Response schema for session endpoints."""
    session_id: str
    wizard_key: str  # Not wizard_id
    wizard_version: str  # String not int
    status: str  # "started", "completed", etc.
    current_step: Optional[str] = None
    state: SessionStateSchema
    created_at: str  # ISO format
    updated_at: str  # ISO format
    expires_at: str  # ISO format

    class Config:
        from_attributes = True


class QuoteRequest(BaseModel):
    """Schema for quote request."""

    data: Dict[str, Any]


class QuoteResponse(BaseModel):
    """Schema for quote response."""

    quote_id: str
    premium: float
    coverage: Dict[str, Any]
    valid_until: str


class AcceptRequest(BaseModel):
    """Schema for accepting a quote."""

    quote_id: str


class IssueResponse(BaseModel):
    """Schema for issue response."""

    policy_id: str
    status: str
    documents: list


@router.get("/api/wizards/{wizard_key}/latest")
async def get_latest_wizard(
    wizard_key: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Get the latest published version of a wizard for runtime."""
    # Find the latest published version
    result = await db.execute(
        select(WizardDefinition)
        .where(WizardDefinition.wizard_key == wizard_key)
        .where(WizardDefinition.status == "published")
        .order_by(WizardDefinition.created_at.desc())
    )
    wizard = result.first()

    if not wizard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No published version found for wizard {wizard_key}",
        )

    wizard_def = wizard[0]

    # Return wrapper response
    return {
        "wizard_key": wizard_def.wizard_key,
        "version": wizard_def.version,
        "schema_version": wizard_def.schema_version,
        "checksum": wizard_def.checksum,
        "created_at": wizard_def.created_at.isoformat(),
        "definition": wizard_def.definition,
    }


@router.get("/api/wizards/{wizard_key}/versions/{version}")
async def get_wizard_by_version(
    wizard_key: str,
    version: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Get a specific version of a wizard for runtime."""
    result = await db.execute(
        select(WizardDefinition)
        .where(WizardDefinition.wizard_key == wizard_key)
        .where(WizardDefinition.version == version)
    )
    wizard = result.scalar_one_or_none()

    if not wizard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wizard {wizard_key} version {version} not found",
        )

    # Return wrapper response
    return {
        "wizard_key": wizard.wizard_key,
        "version": wizard.version,
        "schema_version": wizard.schema_version,
        "checksum": wizard.checksum,
        "created_at": wizard.created_at.isoformat(),
        "definition": wizard.definition,
    }


@router.get("/api/pages/{page_key}/versions/{version}")
async def get_page_by_version(
    page_key: str,
    version: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Get a specific version of a page for runtime."""
    result = await db.execute(
        select(PageDefinition)
        .where(PageDefinition.page_key == page_key)
        .where(PageDefinition.version == version)
    )
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Page {page_key} version {version} not found",
        )

    # Return wrapper response
    return {
        "page_key": page.page_key,
        "version": page.version,
        "schema_version": page.schema_version,
        "checksum": page.checksum,
        "created_at": page.created_at.isoformat(),
        "definition": page.definition,
    }


@router.post("/sessions", response_model=SessionResponse)
async def create_embedded_session(
    request: SessionCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """Create a new wizard session (DB-backed)."""
    # Validate wizard_key and wizard_version exist
    result = await db.execute(
        select(WizardDefinition)
        .where(WizardDefinition.wizard_key == request.wizard_key)
        .where(WizardDefinition.version == request.wizard_version)
    )
    wizard_def = result.scalar_one_or_none()

    if not wizard_def:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wizard {request.wizard_key} version {request.wizard_version} not found",
        )

    # Create session with DB persistence
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=24)

    session = WizardSession(
        id=str(uuid4()),
        wizard_key=request.wizard_key,
        wizard_version=request.wizard_version,
        status="started",
        current_step=None,
        state=request.state.dict() if request.state else {"application": {}, "context": {}},
        created_at=now,
        updated_at=now,
        expires_at=expires_at
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Return response
    return SessionResponse(
        session_id=session.id,
        wizard_key=session.wizard_key,
        wizard_version=session.wizard_version,
        status=session.status,
        current_step=session.current_step,
        state=SessionStateSchema(**session.state),
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
        expires_at=session.expires_at.isoformat() if session.expires_at else None
    )


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_embedded_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """Get session data (DB-backed)."""
    result = await db.execute(
        select(WizardSession).where(WizardSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    return SessionResponse(
        session_id=session.id,
        wizard_key=session.wizard_key,
        wizard_version=session.wizard_version,
        status=session.status,
        current_step=session.current_step,
        state=SessionStateSchema(**session.state),
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
        expires_at=session.expires_at.isoformat() if session.expires_at else None
    )


@router.patch("/sessions/{session_id}", response_model=SessionResponse)
async def update_embedded_session(
    session_id: str,
    request: SessionUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """Update session state and current_step (DB-backed, full replacement)."""
    # Load session from DB
    result = await db.execute(
        select(WizardSession).where(WizardSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    # Full state replacement (not merge)
    session.state = request.state.dict()

    # Update current_step if provided
    if request.current_step is not None:
        session.current_step = request.current_step

    # Update timestamp
    session.updated_at = datetime.utcnow()

    # Persist to database
    await db.commit()
    await db.refresh(session)

    # Return full session
    return SessionResponse(
        session_id=session.id,
        wizard_key=session.wizard_key,
        wizard_version=session.wizard_version,
        status=session.status,
        current_step=session.current_step,
        state=SessionStateSchema(**session.state),
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
        expires_at=session.expires_at.isoformat() if session.expires_at else None
    )


@router.post("/sessions/{session_id}/quote", response_model=QuoteResponse)
async def get_quote(
    session_id: str,
    data: QuoteRequest,
    db: AsyncSession = Depends(get_db),
) -> QuoteResponse:
    """Get a quote based on session data."""
    result = await db.execute(
        select(WizardSession).where(WizardSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    # Update session with latest data
    session.state = {**session.state, **data.data}
    session.updated_at = datetime.utcnow()
    await db.commit()

    # TODO: Implement actual quote calculation
    quote_id = str(uuid4())

    return QuoteResponse(
        quote_id=quote_id,
        premium=99.99,
        coverage={"type": "basic", "amount": 10000},
        valid_until="2025-12-31T23:59:59Z",
    )


@router.post("/sessions/{session_id}/accept")
async def accept_quote(
    session_id: str,
    data: AcceptRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Accept a quote."""
    result = await db.execute(
        select(WizardSession).where(WizardSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    # TODO: Implement quote acceptance logic
    return {
        "status": "accepted",
        "quote_id": data.quote_id,
        "message": "Quote accepted successfully",
    }


@router.post("/sessions/{session_id}/issue", response_model=IssueResponse)
async def issue_policy(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> IssueResponse:
    """Issue a policy for an accepted quote."""
    result = await db.execute(
        select(WizardSession).where(WizardSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    # TODO: Implement policy issuance logic
    policy_id = str(uuid4())

    return IssueResponse(
        policy_id=policy_id,
        status="issued",
        documents=[
            {"type": "policy", "url": f"/api/documents/{policy_id}/policy.pdf"},
            {"type": "receipt", "url": f"/api/documents/{policy_id}/receipt.pdf"},
        ],
    )
