
from flask import jsonify, current_app
import logging
import traceback
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ErrorMiddleware:
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        @app.errorhandler(Exception)
        def handle_exception(error):
            logger.error(f"Unhandled exception: {str(error)}\n{traceback.format_exc()}")
            return self._format_error(error)

        @app.errorhandler(404)
        def not_found(error):
            return self._format_error(error, status=404)

        @app.errorhandler(500)
        def server_error(error):
            return self._format_error(error, status=500)

    def _format_error(self, error: Exception, status: int = 500) -> Dict[str, Any]:
        response = {
            'error': str(error),
            'status': status,
            'success': False
        }
        
        if current_app.debug:
            response['traceback'] = traceback.format_exc()
            
        return jsonify(response), status
