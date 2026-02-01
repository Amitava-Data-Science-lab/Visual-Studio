"""Publishing service for wizards and pages."""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vsb_api.models.wizard import Wizard, WizardVersion
from vsb_api.models.page import Page, PageVersion
from vsb_api.models.release import Release
from vsb_api.services.validation import validate_wizard_definition, validate_page_definition


class PublishingService:
    """Service for publishing wizards and pages."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def publish_wizard(
        self,
        wizard_id: str,
        published_by: Optional[str] = None,
    ) -> WizardVersion:
        """Publish a wizard, creating an immutable version.

        Args:
            wizard_id: The wizard ID to publish.
            published_by: The user publishing the wizard.

        Returns:
            The created wizard version.

        Raises:
            ValueError: If wizard not found or validation fails.
        """
        result = await self.db.execute(select(Wizard).where(Wizard.id == wizard_id))
        wizard = result.scalar_one_or_none()

        if not wizard:
            raise ValueError(f"Wizard {wizard_id} not found")

        # Validate
        errors = validate_wizard_definition(wizard.definition)
        if errors:
            raise ValueError(f"Validation failed: {'; '.join(errors)}")

        # Calculate next version
        next_version = (wizard.published_version or 0) + 1

        # Create version
        version = WizardVersion(
            id=str(uuid4()),
            wizard_id=wizard_id,
            version=next_version,
            definition=wizard.definition,
            published_by=published_by,
        )
        self.db.add(version)

        # Update wizard
        wizard.published_version = next_version

        await self.db.flush()
        return version

    async def publish_page(
        self,
        page_id: str,
        published_by: Optional[str] = None,
    ) -> PageVersion:
        """Publish a page, creating an immutable version.

        Args:
            page_id: The page ID to publish.
            published_by: The user publishing the page.

        Returns:
            The created page version.

        Raises:
            ValueError: If page not found or validation fails.
        """
        result = await self.db.execute(select(Page).where(Page.id == page_id))
        page = result.scalar_one_or_none()

        if not page:
            raise ValueError(f"Page {page_id} not found")

        # Validate
        errors = validate_page_definition(page.definition)
        if errors:
            raise ValueError(f"Validation failed: {'; '.join(errors)}")

        # Calculate next version
        next_version = (page.published_version or 0) + 1

        # Create version
        version = PageVersion(
            id=str(uuid4()),
            page_id=page_id,
            version=next_version,
            definition=page.definition,
            published_by=published_by,
        )
        self.db.add(version)

        # Update page
        page.published_version = next_version

        await self.db.flush()
        return version

    async def create_release(
        self,
        name: str,
        wizard_id: str,
        page_ids: list[str],
        description: Optional[str] = None,
        published_by: Optional[str] = None,
    ) -> Release:
        """Create a release bundling wizard and pages.

        Args:
            name: Release name.
            wizard_id: The wizard to include.
            page_ids: Pages to include.
            description: Optional description.
            published_by: User creating the release.

        Returns:
            The created release.
        """
        # Get wizard snapshot
        wizard_result = await self.db.execute(select(Wizard).where(Wizard.id == wizard_id))
        wizard = wizard_result.scalar_one_or_none()
        if not wizard:
            raise ValueError(f"Wizard {wizard_id} not found")

        wizard_snapshot: Dict[str, Any] = {
            "id": wizard.id,
            "name": wizard.name,
            "definition": wizard.definition,
            "version": wizard.published_version,
        }

        # Get pages snapshot
        pages_snapshot: Dict[str, Any] = {}
        for page_id in page_ids:
            page_result = await self.db.execute(select(Page).where(Page.id == page_id))
            page = page_result.scalar_one_or_none()
            if page:
                pages_snapshot[page_id] = {
                    "id": page.id,
                    "name": page.name,
                    "definition": page.definition,
                    "version": page.published_version,
                }

        # Create release
        release = Release(
            id=str(uuid4()),
            name=name,
            description=description,
            version=f"1.0.{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            wizard_snapshot=wizard_snapshot,
            pages_snapshot=pages_snapshot,
            status="draft",
            published_by=published_by,
        )
        self.db.add(release)

        await self.db.flush()
        return release

    async def publish_release(
        self,
        release_id: str,
        published_by: Optional[str] = None,
    ) -> Release:
        """Publish a release.

        Args:
            release_id: The release to publish.
            published_by: User publishing the release.

        Returns:
            The updated release.
        """
        result = await self.db.execute(select(Release).where(Release.id == release_id))
        release = result.scalar_one_or_none()

        if not release:
            raise ValueError(f"Release {release_id} not found")

        if release.status == "published":
            raise ValueError(f"Release {release_id} is already published")

        release.status = "published"
        release.published_at = datetime.utcnow()
        release.published_by = published_by

        await self.db.flush()
        return release
