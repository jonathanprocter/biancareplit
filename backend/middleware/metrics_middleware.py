"""Prometheus metrics middleware for Flask."""

from typing import Dict, Any, Optional
from flask import Flask, request, g, Response
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    CollectorRegistry,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
import logging
import time
from .base import BaseMiddleware
from .config import middleware_registry

logger = logging.getLogger(__name__)


class MetricsMiddleware(BaseMiddleware):
    """Prometheus metrics middleware for monitoring Flask application."""

    def __init__(self, app: Optional[Flask] = None):
        """Initialize metrics middleware."""
        self._registry = CollectorRegistry()
        self._metrics: Dict[str, Any] = {}
        self._initialized = False
        super().__init__(app)

    def _setup_middleware(self, app: Flask) -> None:
        """Setup metrics middleware with request tracking."""
        try:
            config = middleware_registry.get_config("metrics")
            if not config:
                raise ValueError("Metrics middleware configuration not found")

            self._initialize_metrics(
                {
                    "namespace": "nclex_app",
                    "enable_default_metrics": True,
                    "buckets": [0.1, 0.5, 1.0, 2.0, 5.0],
                }
            )

            @app.before_request
            def before_request():
                if request.endpoint == "metrics":
                    return
                g.start_time = time.time()
                if "active_requests" in self._metrics:
                    self._metrics["active_requests"].labels(method=request.method).inc()

            @app.after_request
            def after_request(response: Response) -> Response:
                if request.endpoint != "metrics":
                    try:
                        if hasattr(g, "start_time"):
                            duration = time.time() - g.start_time
                            endpoint = request.endpoint or "unknown"
                            method = request.method

                            if "request_duration" in self._metrics:
                                self._metrics["request_duration"].labels(
                                    method=method, endpoint=endpoint
                                ).observe(duration)

                            if "request_count" in self._metrics:
                                self._metrics["request_count"].labels(
                                    method=method,
                                    endpoint=endpoint,
                                    status=response.status_code,
                                ).inc()

                            if "active_requests" in self._metrics:
                                self._metrics["active_requests"].labels(
                                    method=method
                                ).dec()

                    except Exception as e:
                        logger.error(f"Error recording metrics: {str(e)}")
                        if "error_count" in self._metrics:
                            self._metrics["error_count"].labels(
                                method=request.method,
                                endpoint=request.endpoint or "unknown",
                                error_type="metrics_recording",
                            ).inc()

                return response

            metrics_path = config.settings.get("endpoint", "/metrics")

            @app.route(metrics_path)
            def metrics():
                return Response(
                    generate_latest(self._registry), mimetype=CONTENT_TYPE_LATEST
                )

            self._initialized = True
            logger.info("Metrics middleware configured successfully")

        except Exception as e:
            logger.error(f"Failed to setup metrics middleware: {str(e)}")
            raise

    def _initialize_metrics(self, settings: Dict[str, Any]) -> None:
        """Initialize Prometheus metrics based on configuration."""
        try:
            if not settings.get("namespace"):
                raise ValueError("Metrics namespace is required")

            metric_types = {"counter": Counter, "histogram": Histogram, "gauge": Gauge}

            namespace = settings["namespace"]
            default_labels = settings.get("default_labels", {})
            buckets = settings.get("buckets", [0.1, 0.5, 1.0, 2.0, 5.0])

            if settings.get("enable_default_metrics", True):
                self._metrics["request_duration"] = Histogram(
                    f"{namespace}_http_request_duration_seconds",
                    "Request duration in seconds",
                    ["method", "endpoint"],
                    registry=self._registry,
                    buckets=buckets,
                )

                self._metrics["request_count"] = Counter(
                    f"{namespace}_http_requests_total",
                    "Total request count",
                    ["method", "endpoint", "status"],
                    registry=self._registry,
                )

                self._metrics["active_requests"] = Gauge(
                    f"{namespace}_active_requests",
                    "Number of active requests",
                    ["method"],
                    registry=self._registry,
                )

                self._metrics["error_count"] = Counter(
                    f"{namespace}_errors_total",
                    "Total error count",
                    ["method", "endpoint", "error_type"],
                    registry=self._registry,
                )

            if "custom_metrics" in settings:
                for metric_name, metric_config in settings["custom_metrics"].items():
                    metric_type = metric_config.get("type", "").lower()
                    if metric_type in metric_types:
                        name = f"{namespace}_{metric_config['name']}"
                        labels = metric_config.get("labels", [])

                        if default_labels:
                            labels.extend(default_labels.keys())

                        self._metrics[metric_name] = metric_types[metric_type](
                            name=name,
                            documentation=metric_config["description"],
                            labelnames=labels,
                            registry=self._registry,
                        )

                        if default_labels and hasattr(
                            self._metrics[metric_name], "labels"
                        ):
                            self._metrics[metric_name].labels(**default_labels)

            logger.info(
                f"Metrics initialization completed successfully with namespace '{namespace}'"
            )

        except Exception as e:
            logger.error(f"Failed to initialize metrics: {str(e)}")
            raise
