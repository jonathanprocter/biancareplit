"""Health monitoring middleware."""

import logging
import psutil
from typing import Dict, Any, Optional
from flask import Flask, jsonify
from .base import BaseMiddleware

logger = logging.getLogger(__name__)


class HealthMiddleware(BaseMiddleware):
    """Monitors application health metrics."""

    def __init__(self, app: Optional[Flask] = None):
        super().__init__(app)

    def init_app(self, app: Flask) -> None:
        """Initialize health endpoints."""

        @app.route("/health")
        def health_check():
            return jsonify(self._get_health_metrics())

    def _get_health_metrics(self) -> Dict[str, Any]:
        """Gather system health metrics."""
        try:
            return {
                "status": "healthy",
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage("/").percent,
            }
        except Exception as e:
            logger.error(f"Error collecting health metrics: {e}")
            return {"status": "degraded", "error": str(e)}


"""Health check middleware implementation."""
import psutil
import logging
from typing import Dict, Any, Optional
from flask import Flask, jsonify
from datetime import datetime
from .base import BaseMiddleware

logger = logging.getLogger(__name__)


class HealthMiddleware(BaseMiddleware):
    """Handles application health monitoring."""

    def __init__(self, app: Optional[Flask] = None):
        super().__init__(app)
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
            return jsonify(health_data)

    def _get_memory_usage(self) -> Dict[str, Any]:
        """Get current memory usage."""
        process = psutil.Process()
        return {
            "used_mb": process.memory_info().rss / 1024 / 1024,
            "percent": process.memory_percent(),
        }

    def _get_cpu_usage(self) -> Dict[str, float]:
        """Get current CPU usage."""
        return {"percent": psutil.cpu_percent(interval=0.1)}
