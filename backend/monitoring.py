"""Monitoring system for the application using Prometheus metrics."""

import logging
import time
from typing import Any, Dict, Optional

from flask import Flask, jsonify, request

from .config.unified_config import config_manager
from .middleware.base import BaseMiddleware

logger = logging.getLogger(__name__)

# Initialize metrics variables
REGISTRY = None
REQUEST_COUNT = None
REQUEST_LATENCY = None
ERROR_COUNT = None
APP_INFO = None
CONTENT_TYPE_LATEST = "text/plain; version=0.0.4; charset=utf-8"

# Try to import prometheus_client
try:
    from prometheus_client import (
        CollectorRegistry,
        Counter,
        Histogram,
        Info,
        generate_latest,
    )

    # Initialize Prometheus metrics
    REGISTRY = CollectorRegistry()

    REQUEST_COUNT = Counter(
        "nclex_request_count",
        "Total number of requests received",
        ["method", "endpoint", "status"],
        registry=REGISTRY,
    )

    REQUEST_LATENCY = Histogram(
        "nclex_request_latency_seconds",
        "Request latency in seconds",
        ["method", "endpoint"],
        registry=REGISTRY,
    )

    ERROR_COUNT = Counter(
        "nclex_error_count", "Total number of errors", ["type"], registry=REGISTRY
    )

    APP_INFO = Info("nclex_app_info", "Application information", registry=REGISTRY)

    PROMETHEUS_AVAILABLE = True
    logger.info("Prometheus metrics initialized successfully")
except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.warning("Prometheus client not available, using basic metrics collection")


class BasicMetricsCollector:
    """Basic metrics collection when Prometheus is not available."""

    def __init__(self):
        self.request_count = 0
        self.errors = {}
        self.latencies = []
        self.app_info = {}

    def record_request(self, method: str, endpoint: str, status: int) -> None:
        self.request_count += 1

    def record_latency(self, method: str, endpoint: str, duration: float) -> None:
        self.latencies.append(duration)

    def record_error(self, error_type: str) -> None:
        self.errors[error_type] = self.errors.get(error_type, 0) + 1

    def set_app_info(self, info: Dict[str, str]) -> None:
        self.app_info.update(info)

    def get_metrics(self) -> Dict[str, Any]:
        avg_latency = sum(self.latencies) / len(self.latencies) if self.latencies else 0
        return {
            "request_count": self.request_count,
            "average_latency": round(avg_latency, 3),
            "errors": self.errors,
            "app_info": self.app_info,
        }


class MetricsMiddleware(BaseMiddleware):
    """Middleware for collecting metrics about request handling."""

    def __init__(self, app: Optional[Flask] = None, **kwargs):
        self.basic_metrics = BasicMetricsCollector()
        super().__init__(app, **kwargs)

    def init_app(self, app: Flask) -> None:
        """Initialize the middleware with the Flask app."""
        try:
            super().init_app(app)

            # Load configuration from unified config
            metrics_config = config_manager.get("MIDDLEWARE", {}).get("metrics", {})
            self.update_config(
                **{
                    "enabled": metrics_config.get("enabled", True),
                    "endpoint": metrics_config.get("endpoint", "/metrics"),
                    "include_paths": metrics_config.get("include_paths", ["/api"]),
                    "exclude_paths": metrics_config.get(
                        "exclude_paths", ["/metrics", "/health"]
                    ),
                }
            )

            if not self.get_config("enabled"):
                logger.info("Metrics collection is disabled")
                return

            # Set application info
            app_info = {
                "version": app.config.get("API_VERSION", "1.0"),
                "environment": app.config.get("ENVIRONMENT", "production"),
            }

            if PROMETHEUS_AVAILABLE:
                APP_INFO.info(app_info)
            else:
                self.basic_metrics.set_app_info(app_info)

            # Register before_request handler
            app.before_request(self.before_request)
            app.after_request(self.after_request)

            # Register metrics endpoint
            @app.route(self.get_config("endpoint"))
            def metrics():
                try:
                    if PROMETHEUS_AVAILABLE:
                        return (
                            generate_latest(REGISTRY),
                            200,
                            {"Content-Type": CONTENT_TYPE_LATEST},
                        )
                    return jsonify(self.basic_metrics.get_metrics()), 200
                except Exception as e:
                    logger.error(f"Error serving metrics: {str(e)}")
                    return jsonify({"error": str(e)}), 500

            logger.info("Metrics middleware initialized successfully")

        except Exception as e:
            logger.error(f"Error initializing metrics middleware: {str(e)}")
            if PROMETHEUS_AVAILABLE:
                ERROR_COUNT.labels(type="middleware_initialization").inc()
            else:
                self.basic_metrics.record_error("middleware_initialization")
            raise

    def before_request(self):
        """Set request start time."""
        if not self.get_config("enabled"):
            return

        request.start_time = time.time()

    def after_request(self, response):
        """Record request metrics."""
        if not self.get_config("enabled"):
            return response

        try:
            path = request.path
            if not any(path.startswith(p) for p in self.get_config("include_paths")):
                return response

            if any(path.startswith(p) for p in self.get_config("exclude_paths")):
                return response

            duration = time.time() - request.start_time
            status_code = response.status_code

            if PROMETHEUS_AVAILABLE:
                REQUEST_COUNT.labels(
                    method=request.method,
                    endpoint=path,
                    status=status_code,
                ).inc()

                REQUEST_LATENCY.labels(
                    method=request.method,
                    endpoint=path,
                ).observe(duration)
            else:
                self.basic_metrics.record_request(request.method, path, status_code)
                self.basic_metrics.record_latency(request.method, path, duration)
        except Exception as e:
            logger.error(f"Error recording metrics: {str(e)}")
            if PROMETHEUS_AVAILABLE:
                ERROR_COUNT.labels(type="metrics_recording").inc()
            else:
                self.basic_metrics.record_error("metrics_recording")

        return response


# Create singleton instance
metrics_middleware = MetricsMiddleware()
