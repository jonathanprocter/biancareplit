"""Logging middleware implementation."""

import logging
import time
from typing import Optional
from flask import Flask, request, g
from .base import BaseMiddleware

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseMiddleware):
    """Handles request/response logging."""

    def __init__(self, app: Optional[Flask] = None):
        super().__init__(app)

    def init_app(self, app: Flask) -> None:
        """Initialize logging middleware."""

        @app.before_request
        def start_timer():
            g.start = time.time()

        @app.after_request
        def log_request(response):
            if hasattr(g, "start"):
                duration = time.time() - g.start
                logger.info(
                    "%s %s %s (%.2fs)",
                    request.method,
                    request.path,
                    response.status,
                    duration,
                )
            return response

        super().init_app(app)
