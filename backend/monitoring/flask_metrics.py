import logging
import time
from functools import wraps

from flask import request
from prometheus_client import Counter, Histogram

from .base_metrics import BaseMetricsRegistry

logger = logging.getLogger(__name__)


class FlaskMetrics(BaseMetricsRegistry):
    """Flask-specific metrics implementation"""

    def __init__(self):
        super().__init__()
        self._setup_metrics()

    def _setup_metrics(self):
        """Set up Flask-specific metrics"""
        self._metrics["http_request_total"] = Counter(
            "flask_http_request_total",
            "Total HTTP requests",
            ["method", "endpoint", "status"],
            registry=self.registry,
        )

        self._metrics["http_request_duration"] = Histogram(
            "flask_http_request_duration_seconds",
            "HTTP request duration",
            ["method", "endpoint"],
            registry=self.registry,
        )

        logger.info("Flask metrics initialized")


flask_metrics = FlaskMetrics()


def init_metrics(app):
    """Initialize metrics endpoint for Flask application"""
    try:
        # First ensure metrics registry is clean
        from .metrics_cleanup import cleanup_metrics
        from .metrics_manager import metrics_manager

        cleanup_metrics()
        logger.info("Flask metrics endpoint initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Flask metrics endpoint: {e}")
        return False


def track_request_metrics():
    """Decorator to track request metrics"""

    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            start_time = time.time()
            status = 500  # Default to error status

            try:
                response = f(*args, **kwargs)
                status = (
                    response.status_code if hasattr(response, "status_code") else 200
                )
                return response
            finally:
                try:
                    duration = time.time() - start_time
                    from backend.monitoring.metrics_manager import metrics_manager

                    metrics_manager.record_request(
                        method=request.method,
                        endpoint=request.endpoint or "unknown",
                        status=status,
                        duration=duration,
                    )
                except Exception as e:
                    logger.error(f"Error recording request metrics: {e}")

        return wrapped

    return decorator
