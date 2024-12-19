
from flask import Flask
from typing import List
from .error_middleware import ErrorMiddleware
from .metrics_middleware import MetricsMiddleware
from ..routes.health import health_bp
import logging

logger = logging.getLogger(__name__)

def init_middleware(app: Flask) -> None:
    """Initialize all middleware components"""
    try:
        # Register health check blueprint
        app.register_blueprint(health_bp, url_prefix='/api')
        
        # Initialize error handling
        error_middleware = ErrorMiddleware()
        error_middleware.init_app(app)
        
        # Initialize metrics
        metrics_middleware = MetricsMiddleware()
        metrics_middleware.init_app(app)
        
        logger.info("All middleware components initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize middleware: {str(e)}")
        raise
