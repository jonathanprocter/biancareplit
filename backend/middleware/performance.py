"""Performance monitoring middleware."""

import time
import logging
from functools import wraps
from flask import g, request
from prometheus_client import Counter, Histogram, CollectorRegistry
import logging
import time
from datetime import datetime
from functools import wraps

# Initialize registry
REGISTRY = CollectorRegistry()

# Define metrics
REQUEST_LATENCY = Histogram(
    "request_latency_seconds",
    "Request latency in seconds",
    ["method", "endpoint"],
    registry=REGISTRY,
)

REQUEST_COUNT = Counter(
    "request_count_total",
    "Total request count",
    ["method", "endpoint", "status"],
    registry=REGISTRY,
)

logger = logging.getLogger(__name__)

# Define metrics
REQUEST_LATENCY = Histogram(
    "request_latency_seconds", "Request latency in seconds", ["method", "endpoint"]
)

REQUEST_COUNT = Counter(
    "request_count_total", "Total request count", ["method", "endpoint", "status"]
)


def performance_monitoring_middleware():
    """Middleware for monitoring request performance."""

    def middleware(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            start_time = time.time()

            try:
                response = f(*args, **kwargs)
                duration = time.time() - start_time

                # Record metrics
                REQUEST_LATENCY.labels(
                    method=request.method, endpoint=request.endpoint
                ).observe(duration)

                REQUEST_COUNT.labels(
                    method=request.method,
                    endpoint=request.endpoint,
                    status=response.status_code,
                ).inc()

                # Log if request is slow (>1s)
                if duration > 1:
                    logger.warning(
                        f"Slow request detected",
                        extra={
                            "duration": f"{duration:.3f}s",
                            "endpoint": request.endpoint,
                            "method": request.method,
                        },
                    )

                return response
            except Exception as e:
                REQUEST_COUNT.labels(
                    method=request.method, endpoint=request.endpoint, status=500
                ).inc()
                raise

        return decorated_function

    return middleware


def init_performance_monitoring(app):
    """Initialize performance monitoring."""
    app.before_request(lambda: setattr(g, "start_time", time.time()))

    @app.after_request
    def after_request(response):
        if hasattr(g, "start_time"):
            duration = time.time() - g.start_time
            response.headers["X-Response-Time"] = f"{duration:.3f}s"
        return response
