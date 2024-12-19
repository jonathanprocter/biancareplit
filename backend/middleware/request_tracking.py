
"""Request tracking middleware."""
import time
import logging
from typing import Optional, Dict, Any
from flask import Flask, Request, Response, g
from .base import BaseMiddleware

logger = logging.getLogger(__name__)

class RequestTrackingMiddleware(BaseMiddleware):
    """Tracks request metrics and performance."""
    
    def __init__(self, app: Optional[Flask] = None, **settings: Any):
        super().__init__(app, **settings)
        self.slow_request_threshold = settings.get('slow_request_threshold', 1.0)
    
    def before_request(self, request: Request) -> Optional[Response]:
        """Start request timing."""
        g.start_time = time.time()
        g.request_id = request.headers.get('X-Request-ID', '')
        return None
        
    def after_request(self, response: Response) -> Response:
        """Log request metrics."""
        total_time = time.time() - getattr(g, 'start_time', 0)
        
        if total_time > self.slow_request_threshold:
            logger.warning(
                f"Slow request detected: {request.method} {request.path} "
                f"took {total_time:.2f}s"
            )
            
        response.headers['X-Response-Time'] = f"{total_time:.3f}s"
        if g.get('request_id'):
            response.headers['X-Request-ID'] = g.request_id
            
        return response
