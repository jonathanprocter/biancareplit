"""Core middleware system for the NCLEX coaching platform."""

from functools import wraps
from flask import request, g, current_app, after_this_request
import logging
import time
from flask import Flask

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)


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
    start_time = time.time()

    @after_this_request
    def add_header(response):
        elapsed = time.time() - start_time
        response.headers["X-Request-Time"] = str(elapsed)
        return response


# Request logging middleware
@middleware_manager.register
def request_logger():
    logger.info(f"Request: {request.method} {request.path}")


app = Flask(__name__)


# Ensure middleware is processed before each request
@app.before_request
def before_request():
    middleware_manager.process_request()
