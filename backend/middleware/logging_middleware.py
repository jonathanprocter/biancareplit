"""Logging middleware for request/response tracking."""

import logging
import time
import uuid
from typing import Optional
from flask import request, g, Response
from .base import BaseMiddleware

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseMiddleware):
    """Middleware for logging requests and responses."""

    def __init__(self):
        super().__init__()
        self.app = None

    def init_app(self, app):
        """Initialize logging middleware."""
        self.app = app

        @app.before_request
        def before_request():
            """Log request details and start timing."""
            g.request_id = str(uuid.uuid4())
            g.start_time = time.time()

            logger.info(
                f"Request started | ID: {g.request_id} | "
                f"{request.method} {request.path} | "
                f"Client: {request.remote_addr} | "
                f"Args: {dict(request.args)} | "
                f"Headers: {dict(request.headers)}"
            )

        @app.after_request
        def after_request(response: Response) -> Response:
            """Log response details and request duration."""
            duration = time.time() - g.start_time
            status_phrase = response.status

            log_msg = (
                f"Request completed | ID: {g.request_id} | "
                f"Duration: {duration:.3f}s | "
                f"{request.method} {request.path} | "
                f"Status: {status_phrase} | "
                f"Size: {response.content_length or 0} bytes"
            )

            if 200 <= response.status_code < 400:
                logger.info(log_msg)
            else:
                logger.warning(log_msg)

            response.headers["X-Request-ID"] = g.request_id
            return response

        @app.teardown_request
        def teardown_request(exc):
            """Log any errors during request handling."""
            if exc:
                logger.error(
                    f"Request failed | ID: {g.request_id} | " f"Error: {str(exc)}"
                )
