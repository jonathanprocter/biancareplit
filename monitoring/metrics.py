from functools import wraps
import time
import logging
from flask import request
from backend.monitoring.metrics_registry import metrics_registry

logger = logging.getLogger(__name__)


class MetricsManager:
    """Metrics manager that uses the centralized registry"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self.registry = metrics_registry
            logger.info("Metrics manager initialized with centralized registry")
            self._initialized = True

    def track_request(self):
        """Decorator to track request metrics"""

        def decorator(f):
            @wraps(f)
            def wrapped(*args, **kwargs):
                start_time = time.time()
                status = 500  # Default to error status

                try:
                    response = f(*args, **kwargs)
                    status = (
                        response.status_code
                        if hasattr(response, "status_code")
                        else 200
                    )
                    return response
                finally:
                    try:
                        # Record request duration
                        duration = time.time() - start_time
                        self.request_latency.labels(
                            method=request.method,
                            endpoint=request.endpoint or "unknown",
                        ).observe(duration)

                        # Count request
                        self.request_counter.labels(
                            method=request.method,
                            endpoint=request.endpoint or "unknown",
                            status=status,
                        ).inc()
                    except Exception as e:
                        logger.error(f"Error recording metrics: {e}")

            return wrapped

        return decorator

    def get_registry(self):
        """Get the metrics registry"""
        return self._registry

    def reset(self):
        """Reset the metrics manager - primarily for testing"""
        self._setup_registry()
        self._setup_metrics()
        logger.info("Metrics manager reset")


# Singleton instance
metrics = MetricsManager()
