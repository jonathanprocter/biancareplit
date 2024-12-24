"""Monitoring system for the application using Prometheus metrics."""

import time
import logging
from typing import Optional, Dict, Any
from flask import current_app, request
from .config.unified_config import config_manager, ConfigurationError

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
        Counter,
        Histogram,
        Info,
        CollectorRegistry,
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
        "nclex_error_count", 
        "Total number of errors", 
        ["type"], 
        registry=REGISTRY
    )

    APP_INFO = Info(
        "nclex_app_info", 
        "Application information", 
        registry=REGISTRY
    )

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
            "app_info": self.app_info
        }

class MetricsMiddleware:
    """Middleware for collecting metrics about request handling."""

    def __init__(self, app=None):
        self.app = app
        self.config = {}
        self.basic_metrics = BasicMetricsCollector()
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        """Initialize the middleware with the Flask app."""
        try:
            # Load configuration from unified config
            metrics_config = config_manager.get("MIDDLEWARE", {}).get("metrics", {})
            self.config = {
                "enabled": metrics_config.get("enabled", True),
                "endpoint": metrics_config.get("endpoint", "/metrics"),
                "include_paths": metrics_config.get("include_paths", ["/api"]),
                "exclude_paths": metrics_config.get("exclude_paths", ["/metrics", "/health"]),
            }

            if not self.config["enabled"]:
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

            # Register metrics endpoint
            @app.route(self.config["endpoint"])
            def metrics():
                if PROMETHEUS_AVAILABLE:
                    return generate_latest(REGISTRY), 200, {"Content-Type": CONTENT_TYPE_LATEST}
                else:
                    return self.basic_metrics.get_metrics(), 200, {"Content-Type": "application/json"}

        except Exception as e:
            logger.error(f"Error initializing metrics middleware: {str(e)}")
            if PROMETHEUS_AVAILABLE:
                ERROR_COUNT.labels(type="middleware_initialization").inc()
            else:
                self.basic_metrics.record_error("middleware_initialization")

    def __call__(self, environ, start_response):
        """Process each request and collect metrics."""
        if not self.config.get("enabled", True):
            return self.app(environ, start_response)

        path = environ.get("PATH_INFO", "")
        if not any(path.startswith(p) for p in self.config["include_paths"]):
            return self.app(environ, start_response)

        if any(path.startswith(p) for p in self.config["exclude_paths"]):
            return self.app(environ, start_response)

        request_start = time.time()

        def metrics_start_response(status, headers):
            try:
                status_code = int(status.split()[0])
                request_time = time.time() - request_start

                if PROMETHEUS_AVAILABLE:
                    # Record request count
                    REQUEST_COUNT.labels(
                        method=environ.get("REQUEST_METHOD", ""),
                        endpoint=path,
                        status=status_code,
                    ).inc()

                    # Record request latency
                    REQUEST_LATENCY.labels(
                        method=environ.get("REQUEST_METHOD", ""),
                        endpoint=path,
                    ).observe(request_time)
                else:
                    # Use basic metrics collection
                    self.basic_metrics.record_request(
                        environ.get("REQUEST_METHOD", ""),
                        path,
                        status_code
                    )
                    self.basic_metrics.record_latency(
                        environ.get("REQUEST_METHOD", ""),
                        path,
                        request_time
                    )

            except Exception as e:
                logger.error(f"Error recording metrics: {str(e)}")
                if PROMETHEUS_AVAILABLE:
                    ERROR_COUNT.labels(type="metrics_recording").inc()
                else:
                    self.basic_metrics.record_error("metrics_recording")

            return start_response(status, headers)

        try:
            return self.app(environ, metrics_start_response)
        except Exception as e:
            logger.error(f"Error in metrics middleware: {str(e)}")
            if PROMETHEUS_AVAILABLE:
                ERROR_COUNT.labels(type="middleware_error").inc()
            else:
                self.basic_metrics.record_error("middleware_error")
            raise

def get_metrics():
    """Get current metrics."""
    if PROMETHEUS_AVAILABLE:
        try:
            return generate_latest(REGISTRY)
        except Exception as e:
            logger.error(f"Error generating Prometheus metrics: {str(e)}")
            return None
    else:
        return  self.basic_metrics.get_metrics()