"""Monitoring system for the application using Prometheus metrics."""
try:
    from prometheus_client import Counter, Histogram, Info, CollectorRegistry, generate_latest
except ImportError:
    # Fallback metrics for development
    Counter = Histogram = Info = CollectorRegistry = generate_latest = None
import time
from flask import current_app, request
import logging

# Define content type for Prometheus metrics
CONTENT_TYPE_LATEST = 'text/plain; version=0.0.4; charset=utf-8'

logger = logging.getLogger(__name__)

# Create a custom registry
REGISTRY = CollectorRegistry()

# Define metrics with custom registry
REQUEST_COUNT = Counter(
    'nclex_request_count',
    'Total number of requests received',
    ['method', 'endpoint', 'status'],
    registry=REGISTRY
)

REQUEST_LATENCY = Histogram(
    'nclex_request_latency_seconds',
    'Request latency in seconds',
    ['method', 'endpoint'],
    registry=REGISTRY
)

ERROR_COUNT = Counter(
    'nclex_error_count',
    'Total number of errors',
    ['type'],
    registry=REGISTRY
)

APP_INFO = Info('nclex_app_info', 'Application information', registry=REGISTRY)

class MetricsMiddleware:
    """Middleware for collecting metrics about request handling."""
    
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        """Initialize the middleware with the Flask app."""
        try:
            APP_INFO.info({
                'version': app.config.get('API_VERSION', '1.0'),
                'environment': app.config.get('ENVIRONMENT', 'production')
            })
        except Exception as e:
            logger.error(f"Error initializing metrics middleware: {str(e)}")

    def __call__(self, environ, start_response):
        """Process each request and collect metrics."""
        request_start = time.time()
        
        def metrics_start_response(status, headers):
            try:
                status_code = int(status.split()[0])
                
                # Record request count
                REQUEST_COUNT.labels(
                    method=environ.get('REQUEST_METHOD', ''),
                    endpoint=environ.get('PATH_INFO', ''),
                    status=status_code
                ).inc()
                
                # Record request latency
                request_time = time.time() - request_start
                REQUEST_LATENCY.labels(
                    method=environ.get('REQUEST_METHOD', ''),
                    endpoint=environ.get('PATH_INFO', '')
                ).observe(request_time)
                
            except Exception as e:
                logger.error(f"Error recording metrics: {str(e)}")
                ERROR_COUNT.labels(type='metrics_recording').inc()
            
            return start_response(status, headers)
        
        try:
            return self.app(environ, metrics_start_response)
        except Exception as e:
            logger.error(f"Error in metrics middleware: {str(e)}")
            ERROR_COUNT.labels(type='middleware_error').inc()
            raise

def get_metrics():
    """Get current metrics from the registry."""
    from prometheus_client import generate_latest
    return generate_latest(REGISTRY)
