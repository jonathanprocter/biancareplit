
"""Error handling middleware implementation."""
import logging
import traceback
from typing import Any, Dict, Optional
from flask import jsonify, request, current_app
from werkzeug.exceptions import HTTPException
from .base import BaseMiddleware

logger = logging.getLogger(__name__)

class ErrorHandlerMiddleware(BaseMiddleware):
    """Handles application-wide error handling."""
    
    def __init__(self):
        super().__init__()
        self.app = None
        
    def init_app(self, app):
        """Initialize error handlers."""
        self.app = app
        
        @app.errorhandler(Exception)
        def handle_exception(e: Exception):
            """Handle any uncaught exception."""
            logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
            
            if isinstance(e, HTTPException):
                response = e.get_response()
                response.data = jsonify({
                    "code": e.code,
                    "name": e.name,
                    "description": e.description,
                }).data
                response.content_type = "application/json"
                return response
            
            error_id = self._log_error(e)
            return jsonify({
                "error": "Internal Server Error",
                "message": str(e) if current_app.debug else "An unexpected error occurred",
                "error_id": error_id,
                "path": request.path
            }), 500

        @app.errorhandler(404)
        def not_found_error(e):
            """Handle 404 errors."""
            return jsonify({
                "error": "Not Found",
                "path": request.path
            }), 404

        @app.errorhandler(405)
        def method_not_allowed(e):
            """Handle 405 errors."""
            return jsonify({
                "error": "Method Not Allowed",
                "path": request.path,
                "method": request.method
            }), 405

    def _log_error(self, error: Exception) -> str:
        """Log error details and return error ID."""
        error_id = hex(hash(str(error) + str(traceback.format_exc())))[-8:]
        logger.error(f"Error ID {error_id}: {str(error)}\n{traceback.format_exc()}")
        return error_id
import logging
from functools import wraps
from flask import jsonify
from typing import Callable, Any

logger = logging.getLogger(__name__)

class ErrorHandlerMiddleware:
    def __init__(self):
        self.logger = logger
        
    def handle_error(self, error: Exception) -> tuple:
        """Handle different types of errors"""
        self.logger.error(f"Error occurred: {str(error)}")
        
        if hasattr(error, 'status_code'):
            code = error.status_code
        else:
            code = 500
            
        return jsonify({
            'error': str(error),
            'status': 'error',
            'code': code
        }), code

    def error_handler(self, f: Callable) -> Callable:
        """Decorator for route error handling"""
        @wraps(f)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                return f(*args, **kwargs)
            except Exception as e:
                return self.handle_error(e)
        return wrapper
import logging
from typing import Dict, Any, Optional
from functools import wraps

logger = logging.getLogger(__name__)

class MiddlewareError(Exception):
    """Base class for middleware exceptions"""
    pass

class MiddlewareConfigError(MiddlewareError):
    """Exception raised for middleware configuration errors"""
    pass

class MiddlewareExecutionError(MiddlewareError):
    """Exception raised for middleware execution errors"""
    pass

def handle_middleware_errors(func):
    """Decorator for handling middleware errors"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except MiddlewareConfigError as e:
            logger.error(f"Middleware configuration error: {str(e)}")
            return {'error': str(e)}, 500
        except MiddlewareExecutionError as e:
            logger.error(f"Middleware execution error: {str(e)}")
            return {'error': str(e)}, 500
        except Exception as e:
            logger.error(f"Unexpected middleware error: {str(e)}")
            return {'error': 'Internal server error'}, 500
    return wrapper

class ErrorHandler:
    def __init__(self):
        self.error_handlers: Dict[type, callable] = {}

    def register_handler(self, error_type: type, handler: callable):
        """Register an error handler for a specific error type"""
        self.error_handlers[error_type] = handler

    def handle_error(self, error: Exception) -> Optional[Dict[str, Any]]:
        """Handle an error using registered handlers"""
        for error_type, handler in self.error_handlers.items():
            if isinstance(error, error_type):
                return handler(error)
        return None
