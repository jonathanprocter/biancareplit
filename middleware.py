from functools import wraps
from flask import request, jsonify, current_app, g
from typing import Callable, Dict, Any, Optional
import logging
from datetime import datetime
import traceback

logger = logging.getLogger(__name__)

def setup_middleware(app):
    """Configure all middleware for the application"""

    @app.before_request
    def before_request():
        g.request_start_time = datetime.utcnow()
        g.request_id = request.headers.get('X-Request-ID', str(datetime.utcnow().timestamp()))

    @app.after_request
    def after_request(response):
        if hasattr(g, 'request_start_time'):
            duration = datetime.utcnow() - g.request_start_time
            response.headers['X-Response-Time'] = f"{duration.total_seconds():.3f}s"
        response.headers['X-Request-ID'] = getattr(g, 'request_id', 'unknown')
        return response

    return app

def error_handler(f: Callable) -> Callable:
    """Enhanced error handling decorator for routes"""

    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(
                f"Error in {f.__name__}: {str(e)}\n"
                f"Stack trace:\n{traceback.format_exc()}"
            )

            error_response = {
                "status": "error",
                "message": str(e),
                "error_type": type(e).__name__,
                "timestamp": datetime.utcnow().isoformat(),
                "request_id": getattr(g, 'request_id', None),
            }

            if current_app.config.get("DEBUG", False):
                error_response["stack_trace"] = traceback.format_exc()

            return jsonify(error_response), 500

    return wrapper

def validate_json(f: Callable) -> Callable:
    """Validate JSON requests"""

    @wraps(f)
    def wrapper(*args, **kwargs):
        if not request.is_json:
            return jsonify({
                "status": "error",
                "message": "Content-Type must be application/json"
            }), 400
        return f(*args, **kwargs)
    return wrapper

def require_api_key(f: Callable) -> Callable:
    """Enhanced API key validation"""

    @wraps(f)
    def wrapper(*args, **kwargs):
        api_key = request.headers.get("X-API-Key")

        if not api_key:
            return jsonify({"status": "error", "message": "API key is required"}), 401

        if api_key != current_app.config.get("API_KEY"):
            logger.warning(f"Invalid API key attempt from {request.remote_addr}")
            return jsonify({"status": "error", "message": "Invalid API key"}), 401

        return f(*args, **kwargs)
    return wrapper

def rate_limit(max_requests: int = 100, window: int = 60) -> Callable:
    """Rate limiting decorator"""
    from collections import defaultdict
    from time import time

    requests = defaultdict(list)

    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            client_ip = request.remote_addr
            current_time = time()

            # Clean old requests
            requests[client_ip] = [req_time for req_time in requests[client_ip] 
                                 if current_time - req_time < window]

            if len(requests[client_ip]) >= max_requests:
                return jsonify({
                    "status": "error",
                    "message": "Rate limit exceeded"
                }), 429

            requests[client_ip].append(current_time)
            return f(*args, **kwargs)
        return wrapper
    return decorator