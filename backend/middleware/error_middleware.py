from flask import Flask, jsonify
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)
logger.setLevel(logging.ERROR)
handler = logging.StreamHandler()
handler.setFormatter(
    logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
)
logger.addHandler(handler)


class ErrorMiddleware:
    def __init__(self, app: Flask = None):
        self.app = app
        if app is not None:
            self.init_app(app)

    def init_app(self, app: Flask) -> None:
        @app.errorhandler(Exception)
        def handle_error(error: Exception) -> Dict[str, Any]:
            logger.error(f"Unhandled error: {str(error)}")
            return (
                jsonify(
                    {"error": "Internal server error", "status": 500, "success": False}
                ),
                500,
            )

        @app.errorhandler(404)
        def not_found(error: Exception) -> Dict[str, Any]:
            return jsonify({"error": "Not Found", "status": 404, "success": False}), 404

        @app.errorhandler(500)
        def server_error(error: Exception) -> Dict[str, Any]:
            return (
                jsonify(
                    {"error": "Internal Server Error", "status": 500, "success": False}
                ),
                500,
            )
