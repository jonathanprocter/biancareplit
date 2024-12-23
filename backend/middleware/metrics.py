import time
import logging
from typing import Optional, Dict, Any
from flask import Flask, request, g, jsonify
from .base import BaseMiddleware

logger = logging.getLogger(__name__)


class MetricsMiddleware(BaseMiddleware):
    """Collects and tracks application metrics."""

    def __init__(self, app: Optional[Flask] = None):
        super().__init__(app)
        self.metrics: Dict[str, Any] = {"requests_total": 0, "request_duration_ms": []}

    def init_app(self, app: Flask) -> None:
        """Initialize metrics collection."""

        @app.before_request
        def start_timer():
            g.start_time = time.time()

        @app.after_request
        def record_metrics(response):
            if hasattr(g, "start_time"):
                duration = (time.time() - g.start_time) * 1000
                self.metrics["requests_total"] += 1
                self.metrics["request_duration_ms"].append(duration)
            return response

        @app.route("/metrics")
        def get_metrics():
            avg_duration = 0
            if self.metrics["request_duration_ms"]:
                avg_duration = sum(self.metrics["request_duration_ms"]) / len(
                    self.metrics["request_duration_ms"]
                )
            return jsonify(
                {
                    "total_requests": self.metrics["requests_total"],
                    "average_response_time_ms": round(avg_duration, 2),
                }
            )
