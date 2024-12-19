
import logging
from typing import Optional, Callable
from flask import Request, Response, request
import re

logger = logging.getLogger(__name__)

class SecurityMiddleware:
    def __init__(self):
        self.allowed_origins = ['https://*.repl.co']
        self.safe_request_pattern = re.compile(r'^[a-zA-Z0-9_\-./]*$')

    def process_request(self, request: Request) -> Optional[Response]:
        if not self._validate_origin(request):
            logger.warning(f"Invalid origin: {request.origin}")
            return Response("Invalid origin", status=403)
            
        if not self._validate_request_path(request):
            logger.warning(f"Invalid request path: {request.path}")
            return Response("Invalid request", status=400)
            
        return None

    def _validate_origin(self, request: Request) -> bool:
        origin = request.headers.get('Origin')
        if not origin:
            return True
        return any(origin.endswith(allowed.replace('*', '')) for allowed in self.allowed_origins)

    def _validate_request_path(self, request: Request) -> bool:
        return bool(self.safe_request_pattern.match(request.path))
