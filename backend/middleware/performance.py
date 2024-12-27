"""Performance monitoring middleware."""

import time
import logging
from functools import wraps
from flask import Flask, g, request
from prometheus_client import Counter, Histogram, CollectorRegistry

# Initialize registry
REGISTRY = CollectorRegistry(auto_describe=True)

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


def performance_monitoring_middleware(app):
    """Middleware for monitoring request performance."""

    @wraps(app)
    def decorated_function(*args, **kwargs):
        start_time = time.time()

        try:
            response = app(*args, **kwargs)
        except Exception as e:
            REQUEST_COUNT.labels(
                method=request.method, endpoint=request.endpoint, status=500
            ).inc()
            logger.exception("Exception occurred during request handling")
            raise
        else:
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
                    f"Slow request detected: {duration:.3f}s, {request.endpoint}, {request.method}"
                )

            return response

    return decorated_function


def init_performance_monitoring(app):
    """Initialize performance monitoring."""
    app.before_request(lambda: setattr(g, "start_time", time.time()))

    @app.after_request
    def after_request(response):
        if hasattr(g, "start_time"):
            duration = time.time() - g.start_time
            response.headers["X-Response-Time"] = f"{duration:.3f}s"
        return response


app = Flask(__name__)
app.wsgi_app = performance_monitoring_middleware(app.wsgi_app)
init_performance_monitoring(app)
