import json
import time
from collections import OrderedDict
from threading import Lock
from typing import Any, Dict, Optional

from flask import Request, Response
from werkzeug.security import safe_str_cmp
from werkzeug.wrappers import Response as WerkzeugResponse

from .base import BaseMiddleware


class CacheMiddleware(BaseMiddleware):
    def __init__(self):
        self.cache: OrderedDict[str, Any] = OrderedDict()
        self.cache_timeout = 300  # 5 minutes default
        self.lock = Lock()

    def process_request(self, request: Request) -> Optional[WerkzeugResponse]:
        if not safe_str_cmp(request.method, "GET"):
            return None

        cache_key = f"{request.path}:{request.query_string.decode('utf-8')}"
        with self.lock:
            cached_data = self.cache.get(cache_key)

            if cached_data:
                timestamp, data = cached_data
                if time.time() - timestamp < self.cache_timeout:
                    return WerkzeugResponse(
                        json.dumps(data), mimetype="application/json"
                    )
                del self.cache[cache_key]

        return None

    def process_response(self, request: Request, response: Response) -> Response:
        if (
            safe_str_cmp(request.method, "GET")
            and response.mimetype == "application/json"
        ):
            cache_key = f"{request.path}:{request.query_string.decode('utf-8')}"
            with self.lock:
                self.cache[cache_key] = (
                    time.time(),
                    json.loads(response.get_data(as_text=True)),
                )
                self.cache.move_to_end(cache_key)

        return response
