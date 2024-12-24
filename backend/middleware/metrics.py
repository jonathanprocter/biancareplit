"""Prometheus metrics middleware for Flask application."""

import time
import logging
from typing import Optional, Dict, Any
from flask import Flask, request, g, Response
from prometheus_client import Counter, Histogram, generate_latest, REGISTRY
from .base import BaseMiddleware

logger = logging.getLogger(__name__)

# Define Prometheus metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"]
)

ERROR_COUNT = Counter(
    "http_errors_total",
    "Total number of HTTP errors",
    ["method", "endpoint", "error_type"]
)

class MetricsMiddleware(BaseMiddleware):
    """Collects and exposes Prometheus metrics."""

    def __init__(self, app: Optional[Flask] = None):
        super().__init__(app)
        self.metrics_endpoint = "/metrics"

    def init_app(self, app: Flask) -> None:
        """Initialize metrics collection."""
        super().init_app(app)

        # Register metrics endpoint
        @app.route(self.metrics_endpoint)
        def metrics():
            try:
                return Response(generate_latest(REGISTRY), 
                              mimetype="text/plain; version=0.0.4")
            except Exception as e:
                logger.error(f"Error generating metrics: {str(e)}")
                return Response("Metrics collection failed", status=500)

    def before_request(self):
        """Record request start time."""
        if not request.path == self.metrics_endpoint:
            g.start_time = time.time()

    def after_request(self, response):
        """Record request metrics."""
        try:
            if not request.path == self.metrics_endpoint:
                # Record request duration
                if hasattr(g, "start_time"):
                    duration = time.time() - g.start_time
                    REQUEST_LATENCY.labels(
                        method=request.method,
                        endpoint=request.path,
                    ).observe(duration)

                # Record request count
                REQUEST_COUNT.labels(
                    method=request.method,
                    endpoint=request.path,
                    status=response.status_code,
                ).inc()

                # Record errors if any
                if response.status_code >= 400:
                    ERROR_COUNT.labels(
                        method=request.method,
                        endpoint=request.path,
                        error_type=str(response.status_code),
                    ).inc()

        except Exception as e:
            logger.error(f"Error recording metrics: {str(e)}")

        return response