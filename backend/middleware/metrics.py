"""Metrics collection middleware."""

import time
import logging
from typing import Optional, Dict, Any
from flask import Flask, request, g
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

            return {
                "total_requests": self.metrics["requests_total"],
                "average_response_time_ms": round(avg_duration, 2),
            }


import time
import logging
from flask import request, g

logger = logging.getLogger(__name__)


class MetricsMiddleware:
    def __init__(self, app):
        self.app = app
        self.request_counts = {}
        self.initialize()

    def initialize(self):
        self.app.before_request(self._before_request)
        self.app.after_request(self._after_request)
        logger.info("Metrics middleware initialized")

    def _before_request(self):
        g.start_time = time.time()
        path = request.path
        self.request_counts[path] = self.request_counts.get(path, 0) + 1

    def _after_request(self, response):
        if hasattr(g, "start_time"):
            duration = time.time() - g.start_time
            response.headers["X-Response-Time"] = str(duration)
        return response

    def get_metrics(self):
        return {
            "request_counts": self.request_counts,
            "total_requests": sum(self.request_counts.values()),
        }
