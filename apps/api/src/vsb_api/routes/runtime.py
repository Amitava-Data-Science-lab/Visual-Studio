"""Runtime/embedded endpoints for wizard execution."""

from typing import Any, Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vsb_api.db import get_db
from vsb_api.models.wizard import WizardDefinition
from vsb_api.models.release import WizardRelease
from vsb_api.services.sessions import SessionManager

router = APIRouter()

# In-memory session manager (replace with Redis/DB in production)
session_manager = SessionManager()


# Request/Response schemas
class SessionCreate(BaseModel):
    """Schema for creating a session."""

    wizard_id: str
    version: Optional[int] = None
    prefill_data: Optional[Dict[str, Any]] = None


class SessionResponse(BaseModel):
    """Schema for session response."""

    session_id: str
    wizard_id: str
    version: int
    data: Dict[str, Any]


class PrefillRequest(BaseModel):
    """Schema for prefill request."""

    data: Dict[str, Any]


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


@router.get("/wizards/{wizard_id}")
async def get_published_wizard(
    wizard_id: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Get the latest published version of a wizard for runtime."""
    result = await db.execute(select(WizardDefinition).where(WizardDefinition.id == wizard_id))
    wizard = result.scalar_one_or_none()

    if not wizard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"WizardDefinition {wizard_id} not found",
        )

    if not wizard.published_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"WizardDefinition {wizard_id} has no published version",
        )

    # Get the latest published version
    version_result = await db.execute(
        select(WizardRelease)
        .where(WizardRelease.wizard_id == wizard_id)
        .where(WizardRelease.version == wizard.published_version)
    )
    version = version_result.scalar_one_or_none()

    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Published version not found",
        )

    return {
        "id": wizard.id,
        "name": wizard.name,
        "version": version.version,
        **version.definition,
    }


@router.get("/wizards/{wizard_id}/versions/{version}")
async def get_wizard_version(
    wizard_id: str,
    version: int,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Get a specific version of a wizard for runtime."""
    result = await db.execute(
        select(WizardRelease)
        .where(WizardRelease.wizard_id == wizard_id)
        .where(WizardRelease.version == version)
    )
    wizard_version = result.scalar_one_or_none()

    if not wizard_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"WizardDefinition {wizard_id} version {version} not found",
        )

    # Get wizard name
    wizard_result = await db.execute(select(WizardDefinition).where(WizardDefinition.id == wizard_id))
    wizard = wizard_result.scalar_one_or_none()

    return {
        "id": wizard_id,
        "name": wizard.name if wizard else "Unknown",
        "version": wizard_version.version,
        **wizard_version.definition,
    }


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """Create a new wizard session."""
    # Verify wizard exists
    result = await db.execute(select(WizardDefinition).where(WizardDefinition.id == data.wizard_id))
    wizard = result.scalar_one_or_none()

    if not wizard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"WizardDefinition {data.wizard_id} not found",
        )

    version = data.version or wizard.published_version
    if not version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No version specified and wizard has no published version",
        )

    session_id = str(uuid4())
    session_data = data.prefill_data or {}

    session_manager.create_session(
        session_id=session_id,
        wizard_id=data.wizard_id,
        version=version,
        data=session_data,
    )

    return SessionResponse(
        session_id=session_id,
        wizard_id=data.wizard_id,
        version=version,
        data=session_data,
    )


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str) -> SessionResponse:
    """Get session data."""
    session = session_manager.get_session(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    return SessionResponse(**session)


@router.post("/sessions/{session_id}/prefill", response_model=SessionResponse)
async def prefill_session(
    session_id: str,
    data: PrefillRequest,
) -> SessionResponse:
    """Prefill session with data."""
    session = session_manager.get_session(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    session_manager.update_session_data(session_id, data.data)
    updated_session = session_manager.get_session(session_id)

    return SessionResponse(**updated_session)  # type: ignore


@router.post("/sessions/{session_id}/quote", response_model=QuoteResponse)
async def get_quote(
    session_id: str,
    data: QuoteRequest,
) -> QuoteResponse:
    """Get a quote based on session data."""
    session = session_manager.get_session(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    # Update session with latest data
    session_manager.update_session_data(session_id, data.data)

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
) -> Dict[str, str]:
    """Accept a quote."""
    session = session_manager.get_session(session_id)

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
async def issue_policy(session_id: str) -> IssueResponse:
    """Issue a policy for an accepted quote."""
    session = session_manager.get_session(session_id)

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
