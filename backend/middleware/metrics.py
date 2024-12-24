"""Prometheus metrics middleware for Flask application."""

import time
import logging
from typing import Optional, Dict, Any
from flask import Flask, request, g
from prometheus_client import Counter, Histogram, CollectorRegistry, generate_latest
from .base import BaseMiddleware
from ..config.unified_config import config_manager

logger = logging.getLogger(__name__)

CONTENT_TYPE_LATEST = "text/plain; version=0.0.4; charset=utf-8"

class MetricsMiddleware(BaseMiddleware):
    """Collects and exposes Prometheus metrics."""

    def __init__(self, app: Optional[Flask] = None):
        """Initialize metrics middleware with proper configuration."""
        self._registry = CollectorRegistry()
        self._setup_metrics()
        self._setup_logging()
        super().__init__(app)

    def _setup_logging(self) -> None:
        """Set up metrics specific logging."""
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

    def _setup_metrics(self) -> None:
        """Initialize metrics collectors."""
        config = config_manager.get("MIDDLEWARE", {}).get("metrics", {})
        namespace = config.get("namespace", "medical_edu")
        buckets = config.get("buckets", [0.1, 0.5, 1.0, 2.0, 5.0])

        self._metrics = {
            "requests": Counter(
                f"{namespace}_http_requests_total",
                "Total number of HTTP requests",
                ["method", "endpoint", "status"],
                registry=self._registry
            ),
            "latency": Histogram(
                f"{namespace}_request_duration_seconds",
                "HTTP request latency in seconds",
                ["method", "endpoint"],
                buckets=buckets,
                registry=self._registry
            ),
            "errors": Counter(
                f"{namespace}_http_errors_total",
                "Total number of HTTP errors",
                ["method", "endpoint", "error_type"],
                registry=self._registry
            ),
            "active_requests": Counter(
                f"{namespace}_active_requests",
                "Currently active HTTP requests",
                ["method"],
                registry=self._registry
            )
        }

    def init_app(self, app: Flask) -> None:
        """Initialize metrics collection with configuration."""
        try:
            super().init_app(app)
            config = config_manager.get("MIDDLEWARE", {}).get("metrics", {})

            if not config.get("enabled", True):
                logger.info("Metrics collection is disabled")
                return

            self.exclude_paths = set(config.get("exclude_paths", ["/metrics", "/health", "/static"]))

            # Register metrics endpoint
            @app.route("/metrics")
            def metrics():
                try:
                    return generate_latest(self._registry), 200, {"Content-Type": CONTENT_TYPE_LATEST}
                except Exception as e:
                    logger.error(f"Error generating metrics: {str(e)}")
                    return {"error": str(e)}, 500

            logger.info("Metrics middleware initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize metrics middleware: {str(e)}")
            if app.debug:
                logger.exception("Detailed error trace:")
            raise

    def before_request(self) -> None:
        """Record request start time and increment active requests."""
        if request.path not in self.exclude_paths:
            g.start_time = time.time()
            self._metrics["active_requests"].labels(
                method=request.method
            ).inc()

    def after_request(self, response):
        """Record request metrics."""
        try:
            if request.path not in self.exclude_paths:
                # Record request duration
                if hasattr(g, "start_time"):
                    duration = time.time() - g.start_time
                    self._metrics["latency"].labels(
                        method=request.method,
                        endpoint=request.path,
                    ).observe(duration)

                # Record request count
                self._metrics["requests"].labels(
                    method=request.method,
                    endpoint=request.path,
                    status=response.status_code,
                ).inc()

                # Decrement active requests
                self._metrics["active_requests"].labels(
                    method=request.method
                ).dec()

                # Record errors if any
                if response.status_code >= 400:
                    self._metrics["errors"].labels(
                        method=request.method,
                        endpoint=request.path,
                        error_type=str(response.status_code),
                    ).inc()

        except Exception as e:
            logger.error(f"Error recording metrics: {str(e)}")
            if hasattr(self, "app") and self.app.debug:
                logger.exception("Detailed error trace:")

        return response

    def get_registry(self) -> CollectorRegistry:
        """Get the Prometheus registry for this middleware."""
        return self._registry