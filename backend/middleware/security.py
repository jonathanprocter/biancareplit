"""Security middleware implementation."""

from typing import Optional
from flask import Flask, Request, Response, abort
import logging
from .base import BaseMiddleware

logger = logging.getLogger(__name__)


class SecurityMiddleware(BaseMiddleware):
    """Middleware for basic security controls."""

    def _configure(self, **config) -> None:
        """Configure security settings."""
        self.request_size_limit = config.get(
            "request_size_limit", 10 * 1024 * 1024
        )  # 10MB default

    def process_request(self, request: Request) -> Optional[Response]:
        """Process request for security checks."""
        if request.content_length and request.content_length > self.request_size_limit:
            logger.warning(
                f"Request size {request.content_length} exceeds limit {self.request_size_limit}"
            )
            abort(413)  # Request Entity Too Large

        return None

    def process_response(self, response: Response) -> Response:
        """Add security headers to response."""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


import logging
from functools import wraps
from flask import request, current_app, abort

logger = logging.getLogger(__name__)


class SecurityMiddleware:
    def __init__(self, app):
        self.app = app
        self.config = app.config.get("SECURITY", {})

    def csrf_protect(self):
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                if request.method == "POST":
                    token = request.headers.get("X-CSRF-Token")
                    if not token:
                        logger.warning("CSRF token missing")
                        abort(403)
                return f(*args, **kwargs)

            return decorated_function

        return decorator

    def initialize(self):
        if self.config.get("csrf_protection", True):
            self.app.before_request(self._validate_request)
        logger.info("Security middleware initialized")

    def _validate_request(self):
        if request.method in ["POST", "PUT", "DELETE"]:
            origin = request.headers.get("Origin")
            allowed_origins = self.config.get("allowed_origins", ["*"])
            if origin and allowed_origins != ["*"] and origin not in allowed_origins:
                logger.warning(f"Invalid origin: {origin}")
                abort(403)
