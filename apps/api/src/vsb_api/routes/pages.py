"""Page CRUD endpoints for Builder UI."""

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
from vsb_api.models.page import PageDefinition

router = APIRouter()


def calculate_checksum(definition: Dict[str, Any]) -> str:
    """Calculate checksum for a page definition."""
    # Sort keys for consistent hashing
    json_str = json.dumps(definition, sort_keys=True)
    return hashlib.sha256(json_str.encode()).hexdigest()


# Request/Response schemas
class PageCreate(BaseModel):
    """Schema for creating a page draft."""

    page_key: str = Field(..., min_length=1, max_length=255,
                         description="Stable identifier (e.g., 'page.travel.selectPlan')")
    definition: Dict[str, Any] = Field(..., description="Page definition JSON")
    schema_version: str = Field(default="page.v1", description="Schema version")
    created_by: str = Field(default="builder-ui", description="Who created this")


class PageUpdate(BaseModel):
    """Schema for updating a page draft."""

    definition: Dict[str, Any] = Field(..., description="Updated page definition JSON")
    created_by: str = Field(default="builder-ui", description="Who updated this")


class PageResponse(BaseModel):
    """Schema for page response."""

    id: str
    page_key: str
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

    page_key: str
    version: str
    status: str
    published_at: datetime
    checksum: str


@router.post("", response_model=PageResponse, status_code=status.HTTP_201_CREATED)
async def create_page_draft(
    data: PageCreate,
    db: AsyncSession = Depends(get_db),
) -> PageDefinition:
    """Create a new page draft.

    This creates a draft version that can be edited before publishing.
    """
    # Check if draft already exists
    result = await db.execute(
        select(PageDefinition)
        .where(PageDefinition.page_key == data.page_key)
        .where(PageDefinition.version == "draft")
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Draft already exists for page_key '{data.page_key}'. Use PUT to update.",
        )

    # Create new draft
    checksum = calculate_checksum(data.definition)
    page = PageDefinition(
        id=str(uuid4()),
        page_key=data.page_key,
        version="draft",
        status="draft",
        schema_version=data.schema_version,
        definition=data.definition,
        checksum=checksum,
        created_by=data.created_by,
    )

    db.add(page)
    await db.commit()
    await db.refresh(page)

    return page


@router.get("/{page_key}/draft", response_model=PageResponse)
async def get_page_draft(
    page_key: str,
    db: AsyncSession = Depends(get_db),
) -> PageDefinition:
    """Get the draft version of a page."""
    result = await db.execute(
        select(PageDefinition)
        .where(PageDefinition.page_key == page_key)
        .where(PageDefinition.version == "draft")
    )
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No draft found for page_key '{page_key}'",
        )

    return page


@router.put("/{page_key}/draft", response_model=PageResponse)
async def update_page_draft(
    page_key: str,
    data: PageUpdate,
    db: AsyncSession = Depends(get_db),
) -> PageDefinition:
    """Update an existing page draft."""
    result = await db.execute(
        select(PageDefinition)
        .where(PageDefinition.page_key == page_key)
        .where(PageDefinition.version == "draft")
    )
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No draft found for page_key '{page_key}'. Use POST to create.",
        )

    # Update definition and checksum
    page.definition = data.definition
    page.checksum = calculate_checksum(data.definition)
    page.created_by = data.created_by

    await db.commit()
    await db.refresh(page)

    return page


@router.get("", response_model=List[PageResponse])
async def list_pages(
    include_published: bool = False,
    db: AsyncSession = Depends(get_db),
) -> List[PageDefinition]:
    """List all page drafts (and optionally published versions).

    By default, only returns drafts. Set include_published=true to see all.
    """
    query = select(PageDefinition).order_by(PageDefinition.created_at.desc())

    if not include_published:
        query = query.where(PageDefinition.status == "draft")

    result = await db.execute(query)
    return list(result.scalars().all())


@router.delete("/{page_key}/draft", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page_draft(
    page_key: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a page draft."""
    result = await db.execute(
        select(PageDefinition)
        .where(PageDefinition.page_key == page_key)
        .where(PageDefinition.version == "draft")
    )
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No draft found for page_key '{page_key}'",
        )

    await db.delete(page)
    await db.commit()


@router.post("/{page_key}/publish", response_model=PublishResponse)
async def publish_page(
    page_key: str,
    db: AsyncSession = Depends(get_db),
) -> PublishResponse:
    """Publish page draft to immutable version.

    Steps:
    1. Load draft
    2. Validate against JSON schema
    3. Determine next version number (v1, v2, v3, ...)
    4. Create new row with published version
    """
    from vsb_api.services.validation import validate_with_schema

    # 1. Load draft
    result = await db.execute(
        select(PageDefinition)
        .where(PageDefinition.page_key == page_key)
        .where(PageDefinition.version == "draft")
    )
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No draft found for page_key '{page_key}'",
        )

    # 2. Validate against schema
    schema_errors = validate_with_schema(draft.definition, draft.schema_version)
    if schema_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Schema validation failed", "errors": schema_errors},
        )

    # 3. Determine next version number
    result = await db.execute(
        select(PageDefinition)
        .where(PageDefinition.page_key == page_key)
        .where(PageDefinition.status == "published")
        .order_by(PageDefinition.version.desc())
    )
    latest_published = result.scalar_one_or_none()

    if latest_published:
        # Extract number from "v1", "v2", etc.
        version_num = int(latest_published.version[1:]) + 1
    else:
        version_num = 1

    next_version = f"v{version_num}"

    # 4. Create published version (new row)
    published = PageDefinition(
        id=str(uuid4()),
        page_key=page_key,
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
        page_key=published.page_key,
        version=published.version,
        status=published.status,
        published_at=published.published_at,
        checksum=published.checksum,
    )


@router.get("/{page_key}/versions/{version}", response_model=PageResponse)
async def get_page_version(
    page_key: str,
    version: str,
    db: AsyncSession = Depends(get_db),
) -> PageDefinition:
    """Get a specific version of a page (draft, v1, v2, etc.)."""
    result = await db.execute(
        select(PageDefinition)
        .where(PageDefinition.page_key == page_key)
        .where(PageDefinition.version == version)
    )
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version '{version}' not found for page_key '{page_key}'",
        )

    return page


@router.get("/{page_key}/latest", response_model=PageResponse)
async def get_latest_page(
    page_key: str,
    db: AsyncSession = Depends(get_db),
) -> PageDefinition:
    """Get the latest published version of a page."""
    result = await db.execute(
        select(PageDefinition)
        .where(PageDefinition.page_key == page_key)
        .where(PageDefinition.status == "published")
        .order_by(PageDefinition.version.desc())
    )
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No published version found for page_key '{page_key}'",
        )

    return page


@router.get("/{page_key}/versions", response_model=List[PageResponse])
async def list_page_versions(
    page_key: str,
    db: AsyncSession = Depends(get_db),
) -> List[PageDefinition]:
    """List all versions of a page (draft + all published)."""
    result = await db.execute(
        select(PageDefinition)
        .where(PageDefinition.page_key == page_key)
        .order_by(PageDefinition.version.desc())
    )
    return list(result.scalars().all())
