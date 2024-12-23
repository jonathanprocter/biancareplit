import logging
import traceback
from typing import Any, Dict, Optional
from flask import jsonify, request, current_app
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware:
    """Handles application-wide error handling."""

    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        """Initialize error handlers."""
        self.app = app

        @app.errorhandler(Exception)
        def handle_exception(e: Exception):
            """Handle any uncaught exception."""
            logger.error(f"Unhandled exception: {str(e)}", exc_info=True)

            if isinstance(e, HTTPException):
                response = e.get_response()
                response.data = jsonify(
                    {
                        "code": e.code,
                        "name": e.name,
                        "description": e.description,
                    }
                ).data
                response.content_type = "application/json"
                return response

            error_id = self._log_error(e)
            return (
                jsonify(
                    {
                        "error": "Internal Server Error",
                        "message": (
                            str(e)
                            if current_app.debug
                            else "An unexpected error occurred"
                        ),
                        "error_id": error_id,
                        "path": request.path,
                    }
                ),
                500,
            )

        @app.errorhandler(404)
        def not_found_error(e):
            """Handle 404 errors."""
            return jsonify({"error": "Not Found", "path": request.path}), 404

        @app.errorhandler(405)
        def method_not_allowed(e):
            """Handle 405 errors."""
            return (
                jsonify(
                    {
                        "error": "Method Not Allowed",
                        "path": request.path,
                        "method": request.method,
                    }
                ),
                405,
            )

    def _log_error(self, error: Exception) -> str:
        """Log error details and return error ID."""
        error_id = hex(hash(str(error) + str(traceback.format_exc())))[-8:]
        logger.error(f"Error ID {error_id}: {str(error)}\n{traceback.format_exc()}")
        return error_id
