"""Wizard CRUD endpoints for Builder UI."""

import hashlib
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vsb_api.db import get_db
from vsb_api.models.wizard import WizardDefinition

router = APIRouter()


def calculate_checksum(definition: Dict[str, Any]) -> str:
    """Calculate checksum for a wizard definition."""
    # Sort keys for consistent hashing
    json_str = json.dumps(definition, sort_keys=True)
    return hashlib.sha256(json_str.encode()).hexdigest()


# Request/Response schemas
class WizardCreate(BaseModel):
    """Schema for creating a wizard draft."""

    wizard_key: str = Field(..., min_length=1, max_length=255,
                           description="Stable identifier (e.g., 'travel-embedded-uk')")
    definition: Dict[str, Any] = Field(..., description="Wizard definition JSON")
    schema_version: str = Field(default="wizard.v1", description="Schema version")
    created_by: str = Field(default="builder-ui", description="Who created this")


class WizardUpdate(BaseModel):
    """Schema for updating a wizard draft."""

    definition: Dict[str, Any] = Field(..., description="Updated wizard definition JSON")
    created_by: str = Field(default="builder-ui", description="Who updated this")


class WizardResponse(BaseModel):
    """Schema for wizard response."""

    id: str
    wizard_key: str
    version: str
    status: str
    schema_version: str
    definition: Dict[str, Any]
    checksum: str
    created_by: str
    created_at: datetime
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PublishResponse(BaseModel):
    """Schema for publish response."""

    wizard_key: str
    version: str
    status: str
    published_at: datetime
    checksum: str


@router.post("", response_model=WizardResponse, status_code=status.HTTP_201_CREATED)
async def create_wizard_draft(
    data: WizardCreate,
    db: AsyncSession = Depends(get_db),
) -> WizardDefinition:
    """Create a new wizard draft.

    This creates a draft version that can be edited before publishing.
    """
    # Check if draft already exists
    result = await db.execute(
        select(WizardDefinition)
        .where(WizardDefinition.wizard_key == data.wizard_key)
        .where(WizardDefinition.version == "draft")
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Draft already exists for wizard_key '{data.wizard_key}'. Use PUT to update.",
        )

    # Create new draft
    checksum = calculate_checksum(data.definition)
    wizard = WizardDefinition(
        id=str(uuid4()),
        wizard_key=data.wizard_key,
        version="draft",
        status="draft",
        schema_version=data.schema_version,
        definition=data.definition,
        checksum=checksum,
        created_by=data.created_by,
    )

    db.add(wizard)
    await db.commit()
    await db.refresh(wizard)

    return wizard


@router.get("/{wizard_key}/draft", response_model=WizardResponse)
async def get_wizard_draft(
    wizard_key: str,
    db: AsyncSession = Depends(get_db),
) -> WizardDefinition:
    """Get the draft version of a wizard."""
    result = await db.execute(
        select(WizardDefinition)
        .where(WizardDefinition.wizard_key == wizard_key)
        .where(WizardDefinition.version == "draft")
    )
    wizard = result.scalar_one_or_none()

    if not wizard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No draft found for wizard_key '{wizard_key}'",
        )

    return wizard


@router.put("/{wizard_key}/draft", response_model=WizardResponse)
async def update_wizard_draft(
    wizard_key: str,
    data: WizardUpdate,
    db: AsyncSession = Depends(get_db),
) -> WizardDefinition:
    """Update an existing wizard draft."""
    result = await db.execute(
        select(WizardDefinition)
        .where(WizardDefinition.wizard_key == wizard_key)
        .where(WizardDefinition.version == "draft")
    )
    wizard = result.scalar_one_or_none()

    if not wizard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No draft found for wizard_key '{wizard_key}'. Use POST to create.",
        )

    # Update definition and checksum
    wizard.definition = data.definition
    wizard.checksum = calculate_checksum(data.definition)
    wizard.created_by = data.created_by

    await db.commit()
    await db.refresh(wizard)

    return wizard


@router.get("", response_model=List[WizardResponse])
async def list_wizards(
    include_published: bool = False,
    db: AsyncSession = Depends(get_db),
) -> List[WizardDefinition]:
    """List all wizard drafts (and optionally published versions).

    By default, only returns drafts. Set include_published=true to see all.
    """
    query = select(WizardDefinition).order_by(WizardDefinition.created_at.desc())

    if not include_published:
        query = query.where(WizardDefinition.status == "draft")

    result = await db.execute(query)
    return list(result.scalars().all())


@router.delete("/{wizard_key}/draft", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wizard_draft(
    wizard_key: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a wizard draft."""
    result = await db.execute(
        select(WizardDefinition)
        .where(WizardDefinition.wizard_key == wizard_key)
        .where(WizardDefinition.version == "draft")
    )
    wizard = result.scalar_one_or_none()

    if not wizard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No draft found for wizard_key '{wizard_key}'",
        )

    await db.delete(wizard)
    await db.commit()


@router.post("/{wizard_key}/publish", response_model=PublishResponse)
async def publish_wizard(
    wizard_key: str,
    db: AsyncSession = Depends(get_db),
) -> PublishResponse:
    """Publish wizard draft to immutable version.

    Steps:
    1. Load draft
    2. Validate against JSON schema
    3. Validate referential integrity (page refs exist)
    4. Determine next version number (v1, v2, v3, ...)
    5. Create new row with published version
    """
    from vsb_api.services.validation import validate_with_schema, validate_wizard_page_refs

    # 1. Load draft
    result = await db.execute(
        select(WizardDefinition)
        .where(WizardDefinition.wizard_key == wizard_key)
        .where(WizardDefinition.version == "draft")
    )
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No draft found for wizard_key '{wizard_key}'",
        )

    # 2. Validate against schema
    schema_errors = validate_with_schema(draft.definition, draft.schema_version)
    if schema_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Schema validation failed", "errors": schema_errors},
        )

    # 3. Validate referential integrity
    ref_errors = await validate_wizard_page_refs(draft.definition, db)
    if ref_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Referential integrity check failed", "errors": ref_errors},
        )

    # 4. Determine next version number
    result = await db.execute(
        select(WizardDefinition)
        .where(WizardDefinition.wizard_key == wizard_key)
        .where(WizardDefinition.status == "published")
        .order_by(WizardDefinition.version.desc())
    )
    latest_published = result.scalar_one_or_none()

    if latest_published:
        # Extract number from "v1", "v2", etc.
        version_num = int(latest_published.version[1:]) + 1
    else:
        version_num = 1

    next_version = f"v{version_num}"

    # 5. Create published version (new row)
    published = WizardDefinition(
        id=str(uuid4()),
        wizard_key=wizard_key,
        version=next_version,
        status="published",
        schema_version=draft.schema_version,
        definition=draft.definition,
        checksum=draft.checksum,  # Same checksum as draft
        created_by=draft.created_by,
        published_at=datetime.utcnow(),
    )

    db.add(published)
    await db.commit()
    await db.refresh(published)

    return PublishResponse(
        wizard_key=published.wizard_key,
        version=published.version,
        status=published.status,
        published_at=published.published_at,
        checksum=published.checksum,
    )


@router.get("/{wizard_key}/versions/{version}", response_model=WizardResponse)
async def get_wizard_version(
    wizard_key: str,
    version: str,
    db: AsyncSession = Depends(get_db),
) -> WizardDefinition:
    """Get a specific version of a wizard (draft, v1, v2, etc.)."""
    result = await db.execute(
        select(WizardDefinition)
        .where(WizardDefinition.wizard_key == wizard_key)
        .where(WizardDefinition.version == version)
    )
    wizard = result.scalar_one_or_none()

    if not wizard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version '{version}' not found for wizard_key '{wizard_key}'",
        )

    return wizard


@router.get("/{wizard_key}/latest", response_model=WizardResponse)
async def get_latest_wizard(
    wizard_key: str,
    db: AsyncSession = Depends(get_db),
) -> WizardDefinition:
    """Get the latest published version of a wizard."""
    result = await db.execute(
        select(WizardDefinition)
        .where(WizardDefinition.wizard_key == wizard_key)
        .where(WizardDefinition.status == "published")
        .order_by(WizardDefinition.version.desc())
    )
    wizard = result.scalar_one_or_none()

    if not wizard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No published version found for wizard_key '{wizard_key}'",
        )

    return wizard


@router.get("/{wizard_key}/versions", response_model=List[WizardResponse])
async def list_wizard_versions(
    wizard_key: str,
    db: AsyncSession = Depends(get_db),
) -> List[WizardDefinition]:
    """List all versions of a wizard (draft + all published)."""
    result = await db.execute(
        select(WizardDefinition)
        .where(WizardDefinition.wizard_key == wizard_key)
        .order_by(WizardDefinition.version.desc())
    )
    return list(result.scalars().all())
