"""Request handling middleware for the NCLEX coaching platform."""
import time
import logging
from functools import wraps
from flask import g, request, current_app
from functools import wraps
import logging
import time
from datetime import datetime
from datetime import datetime

logger = logging.getLogger(__name__)

def request_handler_middleware():
    """Middleware for handling request lifecycle and logging."""
    def middleware(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            request_id = f"req_{int(time.time() * 1000)}"
            g.request_id = request_id
            g.request_start_time = time.time()
            
            logger.info(f"Request started: {request_id}", extra={
                'request_id': request_id,
                'method': request.method,
                'path': request.path,
                'remote_addr': request.remote_addr
            })
            
            try:
                response = f(*args, **kwargs)
                duration = time.time() - g.request_start_time
                
                logger.info(f"Request completed: {request_id}", extra={
                    'request_id': request_id,
                    'duration': f"{duration:.3f}s",
                    'status_code': getattr(response, 'status_code', None)
                })
                
                return response
            except Exception as e:
                logger.error(f"Request failed: {request_id}", extra={
                    'request_id': request_id,
                    'error': str(e),
                    'error_type': type(e).__name__
                }, exc_info=True)
                raise
            
        return decorated_function
    return middleware

def init_middleware(app):
    """Initialize middleware components."""
    @app.before_request
    def before_request():
        g.start_time = time.time()
        g.request_id = f"req_{int(time.time() * 1000)}"

    @app.after_request
    def after_request(response):
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            response.headers['X-Request-Time'] = f"{duration:.3f}s"
            response.headers['X-Request-ID'] = g.request_id
        
        # Add security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        return response
