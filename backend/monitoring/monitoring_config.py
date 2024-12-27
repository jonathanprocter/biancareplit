from flask import Flask
from prometheus_client import Counter, Histogram, Gauge

# Metrics
REQUEST_COUNT = Counter("http_requests_total", "Total request count")
REQUEST_LATENCY = Histogram("http_request_duration_seconds", "Request latency")
MEMORY_USAGE = Gauge("memory_usage_bytes", "Memory usage in bytes")
CPU_USAGE = Gauge("cpu_usage_percent", "CPU usage percentage")


def init_monitoring(app: Flask):
    """Initialize monitoring systems"""
    from prometheus_client import make_wsgi_app
    from werkzeug.middleware.dispatcher import DispatcherMiddleware

    # Add prometheus wsgi middleware
    app.wsgi_app = DispatcherMiddleware(app.wsgi_app, {"/metrics": make_wsgi_app()})
