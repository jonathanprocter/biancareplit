
from typing import Optional, Dict, Any
from flask import Flask, Request, Response
import time
import json
from .base import BaseMiddleware

class CacheMiddleware(BaseMiddleware):
    def __init__(self):
        self.cache: Dict[str, Any] = {}
        self.cache_timeout = 300  # 5 minutes default
        
    def process_request(self, request: Request) -> Optional[Response]:
        if request.method != 'GET':
            return None
            
        cache_key = f"{request.path}:{request.query_string.decode('utf-8')}"
        cached_data = self.cache.get(cache_key)
        
        if cached_data:
            timestamp, data = cached_data
            if time.time() - timestamp < self.cache_timeout:
                return Response(json.dumps(data), mimetype='application/json')
                
        return None
        
    def process_response(self, request: Request, response: Response) -> Response:
        if request.method == 'GET' and response.mimetype == 'application/json':
            cache_key = f"{request.path}:{request.query_string.decode('utf-8')}"
            self.cache[cache_key] = (time.time(), json.loads(response.get_data()))
        return response
