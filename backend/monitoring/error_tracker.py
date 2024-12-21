import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from collections import deque

logger = logging.getLogger(__name__)


class ErrorTracker:
    def __init__(self, max_errors: int = 100):
        self.errors = deque(maxlen=max_errors)
        self.error_counts: Dict[str, int] = {}

    def track_error(
        self, error_type: str, message: str, context: Optional[Dict[str, Any]] = None
    ) -> None:
        """Track a new error occurrence"""
        timestamp = datetime.now().isoformat()
        error_entry = {
            "type": error_type,
            "message": message,
            "timestamp": timestamp,
            "context": context or {},
        }

        self.errors.append(error_entry)
        self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1

        logger.error(f"Error tracked - Type: {error_type}, Message: {message}")

    def get_recent_errors(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most recent errors"""
        return list(self.errors)[-limit:]

    def get_error_statistics(self) -> Dict[str, Any]:
        """Get error statistics"""
        return {"total_errors": len(self.errors), "error_counts": self.error_counts}
