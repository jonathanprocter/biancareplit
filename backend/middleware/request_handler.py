"""Request handling middleware for the NCLEX coaching platform."""

import logging
import time
from datetime import datetime
from functools import wraps

from flask import current_app, g, request

logger = logging.getLogger(__name__)


def request_handler_middleware(f):
    """Middleware for handling request lifecycle and logging."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        g.request_id = f"req_{int(time.time() * 1000)}"
        g.request_start_time = time.time()

        logger.info(
            f"Request started: {g.request_id}",
            extra={
                "request_id": g.request_id,
                "method": request.method,
                "path": request.path,
                "remote_addr": request.remote_addr,
            },
        )

        try:
            response = f(*args, **kwargs)
            duration = time.time() - g.request_start_time

            logger.info(
                f"Request completed: {g.request_id}",
                extra={
                    "request_id": g.request_id,
                    "duration": f"{duration:.3f}s",
                    "status_code": (
                        response.status_code
                        if hasattr(response, "status_code")
                        else None
                    ),
                },
            )

            return response
        except Exception as e:
            logger.error(
                f"Request failed: {g.request_id}",
                extra={
                    "request_id": g.request_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
                exc_info=True,
            )
            raise

    return decorated_function


def init_middleware(app):
    """Initialize middleware components."""

    @app.before_request
    def before_request():
        g.start_time = time.time()
        g.request_id = f"req_{int(time.time() * 1000)}"

    @app.after_request
    def after_request(response):
        if hasattr(g, "start_time"):
            duration = time.time() - g.start_time
            response.headers["X-Request-Time"] = f"{duration:.3f}s"
            response.headers["X-Request-ID"] = g.request_id

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        return response

    app.before_request(before_request)
    app.after_request(after_request)
    app.wsgi_app = request_handler_middleware(app.wsgi_app)
