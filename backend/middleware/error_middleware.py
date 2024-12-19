from flask import jsonify, current_app, Flask
import logging
import traceback
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ErrorMiddleware:
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)

    def init_app(self, app: Flask) -> None:
        @app.errorhandler(Exception)
        def handle_error(error):
            logger.error(f"Unhandled error: {str(error)}")
            return jsonify({
                'error': 'Internal server error',
                'status': 500
            }), 500

        @app.errorhandler(404)
        def not_found(error):
            return jsonify({'error': 'Not Found', 'status': 404, 'success': False}), 404

        @app.errorhandler(500)
        def server_error(error):
            return jsonify({'error': 'Internal Server Error', 'status': 500, 'success': False}), 500