"""Middleware system for the NCLEX coaching platform."""
import time
import logging
import os
from pathlib import Path
from typing import Dict, Any, Callable, Optional
from functools import wraps
import prometheus_client
from prometheus_client import Counter, Histogram, CollectorRegistry
from flask import Flask, request, g, Response, current_app
from .config import middleware_config_manager

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MiddlewareSystem:
    """Manages application middleware and request processing."""
    
    def __init__(self):
        """Initialize middleware system."""
        self.before_request_handlers: Dict[str, Callable] = {}
        self.after_request_handlers: Dict[str, Callable] = {}
        self.logger = logging.getLogger(__name__)
        self._registry = CollectorRegistry()
        self.config = None
        self._metrics_initialized = False
        self._logging_initialized = False
        self._initialized = False
        self._initialization_errors = []
        self._setup_logging()
        
    def _setup_metrics(self):
        """Initialize Prometheus metrics."""
        if self._metrics_initialized:
            return
            
        # Basic HTTP metrics
        self.request_counter = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status'],
            registry=self._registry
        )
        self.request_latency = Histogram(
            'http_request_latency_seconds',
            'HTTP request latency',
            ['method', 'endpoint'],
            registry=self._registry
        )
        
        self._metrics_initialized = True
        logger.info("Metrics initialized successfully")
    
    def _setup_logging(self):
        """Configure middleware logging."""
        if self._logging_initialized:
            return
            
        self.logger.setLevel(logging.INFO)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            
        self._logging_initialized = True
        self.logger.info("Logging initialized successfully")
    
    def init_app(self, app: Flask) -> None:
        """Initialize middleware with Flask application."""
        if self._initialized:
            self.logger.info("Middleware already initialized")
            return
            
        try:
            with app.app_context():
                # Initialize configuration
                middleware_config_manager.init_app(app)
                self.config = app.config.get('MIDDLEWARE_CONFIG', {})
            
            # Initialize components
            self._setup_logging()
            self._setup_metrics()
            
            # Setup request handlers
            self._setup_request_handlers(app)
            
            self._initialized = True
            self.logger.info("Middleware system initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize middleware: {str(e)}")
            raise
    
    def _setup_request_handlers(self, app: Flask):
        """Set up request handling middleware."""
        
        @app.before_request
        def before_request():
            try:
                request_id = request.headers.get('X-Request-ID', f"req_{time.time()}")
                g.request_id = request_id
                g.request_start_time = time.time()
                
                for handler in self.before_request_handlers.values():
                    response = handler()
                    if response is not None:
                        return response
                        
            except Exception as e:
                self.logger.error(f"Error in before_request middleware: {str(e)}")
                raise
        
        @app.after_request
        def after_request(response: Response) -> Response:
            try:
                duration = time.time() - g.get('request_start_time', time.time())
                
                # Update metrics
                self.request_counter.labels(
                    method=request.method,
                    endpoint=request.endpoint or 'unknown',
                    status=response.status_code
                ).inc()
                
                self.request_latency.labels(
                    method=request.method,
                    endpoint=request.endpoint or 'unknown'
                ).observe(duration)
                
                # Add response headers
                response.headers['X-Request-ID'] = g.get('request_id', 'unknown')
                response.headers['X-Response-Time'] = f"{duration:.3f}s"
                
                # Execute after request handlers
                for handler in self.after_request_handlers.values():
                    try:
                        handler_response = handler(response)
                        if handler_response is not None:
                            response = handler_response
                    except Exception as e:
                        self.logger.error(f"Error in after_request handler: {str(e)}")
                
                return response
                
            except Exception as e:
                self.logger.error(f"Error in after_request middleware: {str(e)}")
                return response
    
    def before_request(self, name: str):
        """Register a before request handler."""
        def decorator(f: Callable) -> Callable:
            self.before_request_handlers[name] = f
            return f
        return decorator
    
    def after_request(self, name: str):
        """Register an after request handler."""
        def decorator(f: Callable) -> Callable:
            self.after_request_handlers[name] = f
            return f
        return decorator
    
    def get_metrics(self) -> CollectorRegistry:
        """Get current metrics registry."""
        return self._registry

# Create singleton instance
middleware_system = MiddlewareSystem()