"""Security middleware implementation."""

import logging
from functools import wraps
from typing import Optional

from flask import Flask, Request, Response, abort, g

from .base import BaseMiddleware

logger = logging.getLogger(__name__)


class SecurityMiddleware(BaseMiddleware):
    """Middleware for basic security controls."""

    def __init__(self, app: Flask):
        self.app = app
        self.config = app.config.get("SECURITY", {})
        super().__init__()

    def _configure(self) -> None:
        """Configure security settings."""
        self.request_size_limit = self.config.get(
            "request_size_limit", 10 * 1024 * 1024
        )  # 10MB default

    def process_request(self) -> Optional[Response]:
        """Process request for security checks."""
        if (
            g.request.content_length
            and g.request.content_length > self.request_size_limit
        ):
            logger.warning(
                f"Request size {g.request.content_length} exceeds limit {self.request_size_limit}"
            )
            abort(413)  # Request Entity Too Large

        if g.request.method in ["POST", "PUT", "DELETE"]:
            origin = g.request.headers.get("Origin")
            allowed_origins = self.config.get("allowed_origins", ["*"])
            if origin and allowed_origins != ["*"] and origin not in allowed_origins:
                logger.warning(f"Invalid origin: {origin}")
                abort(403)

        return None

    @staticmethod
    def process_response(response: Response) -> Response:
        """Add security headers to response."""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

    @staticmethod
    def csrf_protect():
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                if g.request.method == "POST":
                    token = g.request.headers.get("X-CSRF-Token")
                    if not token:
                        logger.warning("CSRF token missing")
                        abort(403)
                return f(*args, **kwargs)

            return decorated_function

        return decorator

    def initialize(self):
        self._configure()
        if self.config.get("csrf_protection", True):
            self.app.before_request(self.process_request)
        logger.info("Security middleware initialized")
