"""Health check middleware implementation."""

import psutil
import logging
from typing import Dict, Any, Optional
from flask import Flask, jsonify, make_response, current_app
from datetime import datetime
from .base import BaseMiddleware

logger = logging.getLogger(__name__)


class HealthMiddleware(BaseMiddleware):
    """Handles application health monitoring."""

    def __init__(self, app: Optional[Flask] = None):
        super().__init__(app)
        if app is not None:
            self.init_app(app)
        self.start_time = datetime.now()

    def init_app(self, app: Flask) -> None:
        """Initialize health check endpoints."""

        @app.route("/health")
        def health_check():
            health_data = {
                "status": "ok",
                "timestamp": datetime.now().isoformat(),
                "uptime": str(datetime.now() - self.start_time),
                "memory": self._get_memory_usage(),
                "cpu": self._get_cpu_usage(),
            }
            response = make_response(jsonify(health_data), 200)
            response.headers["Content-Type"] = "application/json"
            return response

    def _get_memory_usage(self) -> Dict[str, Any]:
        """Get current memory usage."""
        process = psutil.Process()
        return {
            "used_mb": round(process.memory_info().rss / 1024 / 1024, 2),
            "percent": round(process.memory_percent(), 2),
        }

    def _get_cpu_usage(self) -> Dict[str, float]:
        """Get current CPU usage."""
        return {"percent": round(psutil.cpu_percent(interval=0.1), 2)}
