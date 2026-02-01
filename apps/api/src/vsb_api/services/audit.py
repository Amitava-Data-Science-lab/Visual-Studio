"""Audit logging service."""

import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class AuditService:
    """Service for audit logging.

    Note: In production, this should write to a proper audit log store.
    """

    def log_event(
        self,
        event_type: str,
        resource_type: str,
        resource_id: str,
        user_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log an audit event.

        Args:
            event_type: Type of event (create, update, delete, publish, etc.)
            resource_type: Type of resource (wizard, page, release, session)
            resource_id: ID of the resource
            user_id: ID of the user performing the action
            details: Additional event details
        """
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "user_id": user_id,
            "details": details or {},
        }

        logger.info(f"AUDIT: {json.dumps(event)}")

    def log_wizard_created(
        self,
        wizard_id: str,
        wizard_name: str,
        user_id: Optional[str] = None,
    ) -> None:
        """Log wizard creation."""
        self.log_event(
            event_type="create",
            resource_type="wizard",
            resource_id=wizard_id,
            user_id=user_id,
            details={"name": wizard_name},
        )

    def log_wizard_updated(
        self,
        wizard_id: str,
        changes: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> None:
        """Log wizard update."""
        self.log_event(
            event_type="update",
            resource_type="wizard",
            resource_id=wizard_id,
            user_id=user_id,
            details={"changes": list(changes.keys())},
        )

    def log_wizard_published(
        self,
        wizard_id: str,
        version: int,
        user_id: Optional[str] = None,
    ) -> None:
        """Log wizard publication."""
        self.log_event(
            event_type="publish",
            resource_type="wizard",
            resource_id=wizard_id,
            user_id=user_id,
            details={"version": version},
        )

    def log_session_created(
        self,
        session_id: str,
        wizard_id: str,
        user_id: Optional[str] = None,
    ) -> None:
        """Log session creation."""
        self.log_event(
            event_type="create",
            resource_type="session",
            resource_id=session_id,
            user_id=user_id,
            details={"wizard_id": wizard_id},
        )

    def log_quote_requested(
        self,
        session_id: str,
        quote_id: str,
        user_id: Optional[str] = None,
    ) -> None:
        """Log quote request."""
        self.log_event(
            event_type="quote",
            resource_type="session",
            resource_id=session_id,
            user_id=user_id,
            details={"quote_id": quote_id},
        )

    def log_policy_issued(
        self,
        session_id: str,
        policy_id: str,
        user_id: Optional[str] = None,
    ) -> None:
        """Log policy issuance."""
        self.log_event(
            event_type="issue",
            resource_type="session",
            resource_id=session_id,
            user_id=user_id,
            details={"policy_id": policy_id},
        )


# Global audit service instance
audit_service = AuditService()
