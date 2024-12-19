import time
from functools import wraps
from flask import request, jsonify, current_app, g, Response
from typing import Callable, Dict, Any, Optional, Tuple
import logging
from datetime import datetime
import traceback

logger = logging.getLogger(__name__)

class RequestMiddleware:
    """Enhanced middleware for handling requests and responses with proper lifecycle hooks"""
    def __init__(self, app):
        self.app = app
        self.logger = logging.getLogger(__name__)
        self.request_counts = {}
        self.window_size = 60  # 1 minute window
        self.excluded_paths = {'/static/', '/metrics', '/health'}  # Paths to exclude from rate limiting
        self._setup_logging()

    def _setup_logging(self):
        """Configure logging for the middleware"""
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler = logging.StreamHandler()
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)

    def _check_rate_limit(self, environ):
        """Check if the request exceeds rate limit"""
        client_ip = environ.get('REMOTE_ADDR', 'unknown')
        current_time = time.time()
        
        # Clean up old entries
        self.request_counts = {
            ip: (count, timestamp) 
            for ip, (count, timestamp) in self.request_counts.items()
            if current_time - timestamp < self.window_size
        }
        
        # Get current count for IP
        count, timestamp = self.request_counts.get(client_ip, (0, current_time))
        
        # Reset count if window has passed
        if current_time - timestamp >= self.window_size:
            count = 0
            timestamp = current_time
            
        # Check against limit
        if count >= 100:  # 100 requests per minute
            return False
            
        # Update count
        self.request_counts[client_ip] = (count + 1, timestamp)
        return True

    def __call__(self, environ, start_response):
        request_start = time.time()
        environ['request_start_time'] = request_start
        
        # Add request ID
        request_id = environ.get('HTTP_X_REQUEST_ID', str(time.time()))
        environ['request_id'] = request_id
        
        path = environ.get('PATH_INFO', '')
        method = environ.get('REQUEST_METHOD', '')
        
        # Enhanced logging
        self.logger.info(f"Request {request_id}: {method} {path}")
        
        # Rate limiting check
        if not self._check_rate_limit(environ):
            status = '429 Too Many Requests'
            response_headers = [
                ('Content-Type', 'application/json'),
                ('X-RateLimit-Reset', str(int(time.time() + self.window_size)))
            ]
            start_response(status, response_headers)
            return [b'{"error": "Rate limit exceeded"}']
        
        def custom_start_response(status, headers, exc_info=None):
            duration = time.time() - request_start
            status_code = int(status.split()[0])
            
            logger.info(
                f"Response {request_id}: {status} (took {duration:.2f}s)"
            )
            
            headers.append(('X-Request-ID', request_id))
            headers.append(('X-Response-Time', f"{duration:.2f}s"))
            
            return start_response(status, headers, exc_info)
        
        return self.app(environ, custom_start_response)

def error_handler(f):
    """Enhanced error handling decorator"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            # Get full stack trace
            stack_trace = traceback.format_exc()
            
            logger.error(
                f"Error in {f.__name__}: {str(e)}\n"
                f"Stack trace:\n{stack_trace}"
            )
            
            error_response = {
                'status': 'error',
                'message': str(e),
                'error_type': type(e).__name__,
                'timestamp': datetime.utcnow().isoformat(),
                'request_id': getattr(g, 'request_id', None)
            }
            
            if current_app.config.get('DEBUG', False):
                error_response['stack_trace'] = stack_trace
            
            return jsonify(error_response), 500
    return wrapper

def validate_json(f):
    """Validate JSON requests"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not request.is_json:
            return jsonify({
                'status': 'error',
                'message': 'Content-Type must be application/json'
            }), 400
            
        return f(*args, **kwargs)
    return wrapper

def require_api_key(f):
    """Enhanced API key validation"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        
        if not api_key:
            return jsonify({
                'status': 'error',
                'message': 'API key is required'
            }), 401
            
        if api_key != current_app.config.get('API_KEY'):
            logger.warning(f"Invalid API key attempt from {request.remote_addr}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid API key'
            }), 401
            
        return f(*args, **kwargs)
    return wrapper