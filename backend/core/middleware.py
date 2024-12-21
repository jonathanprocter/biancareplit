"""Core middleware system for the NCLEX coaching platform."""

from functools import wraps
from flask import request, g, current_app
import logging
import time

logger = logging.getLogger(__name__)


class MiddlewareManager:
    """Manages middleware execution and configuration."""

    def __init__(self):
        self.middleware_stack = []

    def register(self, middleware_fn):
        """Register a middleware function."""
        self.middleware_stack.append(middleware_fn)
        return middleware_fn

    def process_request(self):
        """Process all registered middleware for a request."""
        for middleware in self.middleware_stack:
            try:
                middleware()
            except Exception as e:
                logger.error(f"Middleware error: {str(e)}")
                raise


# Create middleware manager instance
middleware_manager = MiddlewareManager()


# Request timing middleware
@middleware_manager.register
def request_timer():
    g.start_time = time.time()

    def after_request(response):
        if hasattr(g, "start_time"):
            elapsed = time.time() - g.start_time
            response.headers["X-Request-Time"] = str(elapsed)
        return response

    if current_app:
        current_app.after_request(after_request)


# Request logging middleware
@middleware_manager.register
def request_logger():
    logger.info(f"Request: {request.method} {request.path}")
