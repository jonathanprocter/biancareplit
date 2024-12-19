"""Prometheus metrics middleware for Flask."""
from typing import Dict, Any, Optional
from flask import Flask, request, g, Response
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST
import logging
import time
from .base import BaseMiddleware
from .config import middleware_registry
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST

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
            # Get metrics configuration
            config = middleware_registry.get_config('metrics')
            if not config:
                raise ValueError("Metrics middleware configuration not found")

            # Initialize metrics collectors
            self._initialize_metrics({
                'namespace': 'nclex_app',
                'enable_default_metrics': True,
                'buckets': [0.1, 0.5, 1.0, 2.0, 5.0]
            })
            
            # Setup request handlers
            @app.before_request
            def before_request():
                if request.endpoint == 'metrics':
                    return
                g.start_time = time.time()
                if 'active_requests' in self._metrics:
                    self._metrics['active_requests'].labels(
                        method=request.method
                    ).inc()

            @app.after_request
            def after_request(response: Response) -> Response:
                if request.endpoint != 'metrics':
                    try:
                        if hasattr(g, 'start_time'):
                            duration = time.time() - g.start_time
                            endpoint = request.endpoint or 'unknown'
                            method = request.method

                            # Record request duration
                            if 'request_duration' in self._metrics:
                                self._metrics['request_duration'].labels(
                                    method=method,
                                    endpoint=endpoint
                                ).observe(duration)

                            # Record request count
                            if 'request_count' in self._metrics:
                                self._metrics['request_count'].labels(
                                    method=method,
                                    endpoint=endpoint,
                                    status=response.status_code
                                ).inc()

                            # Update active requests
                            if 'active_requests' in self._metrics:
                                self._metrics['active_requests'].labels(
                                    method=method
                                ).dec()

                    except Exception as e:
                        logger.error(f"Error recording metrics: {str(e)}")
                        if 'error_count' in self._metrics:
                            self._metrics['error_count'].labels(
                                method=request.method,
                                endpoint=request.endpoint or 'unknown',
                                error_type='metrics_recording'
                            ).inc()

                return response

            # Add metrics endpoint
            metrics_path = config.settings.get('endpoint', '/metrics')
            @app.route(metrics_path)
            def metrics():
                return Response(
                    generate_latest(self._registry),
                    mimetype=CONTENT_TYPE_LATEST
                )

            self._initialized = True
            logger.info("Metrics middleware configured successfully")

        except Exception as e:
            logger.error(f"Failed to setup metrics middleware: {str(e)}")
            raise

    def _initialize_metrics(self, settings: Dict[str, Any]) -> None:
        """Initialize Prometheus metrics based on configuration."""
        try:
            if not settings.get('namespace'):
                raise ValueError("Metrics namespace is required")

            metric_types = {
                'counter': Counter,
                'histogram': Histogram,
                'gauge': Gauge
            }

            namespace = settings['namespace']
            default_labels = settings.get('default_labels', {})
            buckets = settings.get('buckets', [0.1, 0.5, 1.0, 2.0, 5.0])

            # Initialize default metrics if enabled
            if settings.get('enable_default_metrics', True):
                self._metrics['request_duration'] = Histogram(
                    f'{namespace}_http_request_duration_seconds',
                    'Request duration in seconds',
                    ['method', 'endpoint'],
                    registry=self._registry,
                    buckets=buckets
                )

                self._metrics['request_count'] = Counter(
                    f'{namespace}_http_requests_total',
                    'Total request count',
                    ['method', 'endpoint', 'status'],
                    registry=self._registry
                )

                self._metrics['active_requests'] = Gauge(
                    f'{namespace}_active_requests',
                    'Number of active requests',
                    ['method'],
                    registry=self._registry
                )

                self._metrics['error_count'] = Counter(
                    f'{namespace}_errors_total',
                    'Total error count',
                    ['method', 'endpoint', 'error_type'],
                    registry=self._registry
                )

            # Initialize custom metrics from configuration
            if 'custom_metrics' in settings:
                for metric_name, metric_config in settings['custom_metrics'].items():
                    metric_type = metric_config.get('type', '').lower()
                    if metric_type in metric_types:
                        name = f"{namespace}_{metric_config['name']}"
                        labels = metric_config.get('labels', [])
                        
                        # Apply default labels if any
                        if default_labels:
                            labels.extend(default_labels.keys())
                        
                        self._metrics[metric_name] = metric_types[metric_type](
                            name=name,
                            documentation=metric_config['description'],
                            labelnames=labels,
                            registry=self._registry
                        )

                        # Pre-set default labels if specified
                        if default_labels and hasattr(self._metrics[metric_name], 'labels'):
                            self._metrics[metric_name].labels(**default_labels)

            logger.info(f"Metrics initialization completed successfully with namespace '{namespace}'")

        except Exception as e:
            logger.error(f"Failed to initialize metrics: {str(e)}")
            raise
"""Metrics collection middleware."""
import time
import logging
from typing import Any, Dict, Optional
from flask import Flask, request, g
from .base import BaseMiddleware

logger = logging.getLogger(__name__)

class MetricsMiddleware(BaseMiddleware):
    def init_app(self, app: Flask) -> None:
        super().init_app(app)
        
        @app.before_request
        def start_timer():
            g.start_time = time.time()
            
        @app.after_request
        def record_metrics(response):
            if hasattr(g, 'start_time'):
                duration = time.time() - g.start_time
                endpoint = request.endpoint or 'unknown'
                logger.info(f"Request to {endpoint} took {duration:.2f}s")
            return response
"""Metrics middleware for monitoring application performance."""
import time
from typing import Optional
from flask import Flask, request, g
from prometheus_client import Counter, Histogram
from .base import BaseMiddleware

# Define metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request duration')

class MetricsMiddleware(BaseMiddleware):
    """Handles application metrics collection."""
    
    def __init__(self, app: Optional[Flask] = None):
        super().__init__(app)
        
    def init_app(self, app: Flask) -> None:
        """Initialize metrics middleware."""
        @app.before_request
        def start_timer():
            g.start = time.time()
            
        @app.after_request
        def record_metrics(response):
            if hasattr(g, 'start'):
                duration = time.time() - g.start
                REQUEST_COUNT.labels(
                    method=request.method,
                    endpoint=request.endpoint or 'unknown',
                    status=response.status_code
                ).inc()
                REQUEST_LATENCY.observe(duration)
            return response
import time
from functools import wraps
from flask import request, Response
from typing import Callable, Any
from ..monitoring.metrics_registry import MetricsRegistry

class MetricsMiddleware:
    def __init__(self):
        self.metrics = MetricsRegistry()

    def __call__(self, f: Callable) -> Callable:
        @wraps(f)
        def decorated(*args: Any, **kwargs: Any) -> Any:
            start_time = time.time()
            
            try:
                response = f(*args, **kwargs)
                status_code = response.status_code if isinstance(response, Response) else 200
                
                self.metrics.record_request(
                    method=request.method,
                    endpoint=request.endpoint or 'unknown',
                    status=status_code
                )
                
                duration = time.time() - start_time
                self.metrics.record_response_time(
                    endpoint=request.endpoint or 'unknown',
                    duration=duration
                )
                
                return response
                
            except Exception as e:
                self.metrics.record_error(error_type=type(e).__name__)
                raise
                
        return decorated
from flask import request, g
import time
from prometheus_client import Counter, Histogram
from .base import BaseMiddleware

class MetricsMiddleware(BaseMiddleware):
    def __init__(self):
        self.request_count = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status']
        )
        
        self.request_latency = Histogram(
            'http_request_duration_seconds',
            'HTTP request latency',
            ['method', 'endpoint']
        )
    
    def init_app(self, app):
        @app.before_request
        def before_request():
            g.start_time = time.time()
            
        @app.after_request
        def after_request(response):
            # Record request count
            self.request_count.labels(
                method=request.method,
                endpoint=request.endpoint,
                status=response.status_code
            ).inc()
            
            # Record latency
            self.request_latency.labels(
                method=request.method,
                endpoint=request.endpoint
            ).observe(time.time() - g.start_time)
            
            return response
from flask import request, g
import time
import psutil
from prometheus_client import Counter, Histogram
from .base import BaseMiddleware
import logging

logger = logging.getLogger(__name__)

# Define metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_latency_seconds', 'Request latency in seconds',
                          ['method', 'endpoint'])
MEMORY_USAGE = Histogram('memory_usage_bytes', 'Memory usage in bytes')
CPU_USAGE = Histogram('cpu_usage_percent', 'CPU usage percentage')

class MetricsMiddleware(BaseMiddleware):
    def __init__(self):
        self.app = None
        
    def init_app(self, app):
        self.app = app

        @app.before_request
        def start_timer():
            g.start_time = time.time()
            
        @app.after_request
        def record_metrics(response):
            if hasattr(g, 'start_time'):
                duration = time.time() - g.start_time
                REQUEST_LATENCY.labels(
                    method=request.method,
                    endpoint=request.endpoint or 'unknown'
                ).observe(duration)
                
            REQUEST_COUNT.labels(
                method=request.method,
                endpoint=request.endpoint or 'unknown',
                status=response.status_code
            ).inc()
            
            # System metrics
            MEMORY_USAGE.observe(psutil.Process().memory_info().rss)
            CPU_USAGE.observe(psutil.cpu_percent())
            
            return response