"""Session management service."""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional


class SessionManager:
    """In-memory session manager.

    Note: In production, replace with Redis or database-backed sessions.
    """

    def __init__(self, ttl_hours: int = 24):
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._ttl = timedelta(hours=ttl_hours)

    def create_session(
        self,
        session_id: str,
        wizard_id: str,
        version: int,
        data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a new session.

        Args:
            session_id: Unique session identifier.
            wizard_id: The wizard this session is for.
            version: The wizard version.
            data: Initial session data.

        Returns:
            The created session.
        """
        session = {
            "session_id": session_id,
            "wizard_id": wizard_id,
            "version": version,
            "data": data or {},
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + self._ttl).isoformat(),
        }
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a session by ID.

        Args:
            session_id: The session ID.

        Returns:
            The session data or None if not found/expired.
        """
        session = self._sessions.get(session_id)

        if not session:
            return None

        # Check expiration
        expires_at = datetime.fromisoformat(session["expires_at"])
        if datetime.utcnow() > expires_at:
            del self._sessions[session_id]
            return None

        return session

    def update_session_data(
        self,
        session_id: str,
        data: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Update session data.

        Args:
            session_id: The session ID.
            data: Data to merge into the session.

        Returns:
            The updated session or None if not found.
        """
        session = self.get_session(session_id)

        if not session:
            return None

        session["data"].update(data)
        session["updated_at"] = datetime.utcnow().isoformat()

        return session

    def delete_session(self, session_id: str) -> bool:
        """Delete a session.

        Args:
            session_id: The session ID.

        Returns:
            True if deleted, False if not found.
        """
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def cleanup_expired(self) -> int:
        """Remove expired sessions.

        Returns:
            Number of sessions removed.
        """
        now = datetime.utcnow()
        expired = [
            sid
            for sid, session in self._sessions.items()
            if datetime.fromisoformat(session["expires_at"]) < now
        ]

        for sid in expired:
            del self._sessions[sid]

        return len(expired)
