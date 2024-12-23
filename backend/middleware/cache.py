import logging
from functools import wraps
from typing import Any, Callable
from flask import request, Response
from datetime import datetime, timedelta
from werkzeug.security import safe_str_cmp
from hashlib import sha256

logger = logging.getLogger(__name__)


class CacheMiddleware:
    """Response caching middleware."""

    def __init__(self, app: Any) -> None:
        self.app = app
        self.cache = {}
        self._setup_middleware()

    def _setup_middleware(self) -> None:
        """Setup cache handlers."""
        logger.info("Cache middleware initialized")

    def cached(self, timeout: int = 300) -> Callable:
        def decorator(f: Callable) -> Callable:
            @wraps(f)
            def decorated_function(*args: Any, **kwargs: Any) -> Any:
                cache_key = sha256(
                    f"{request.path}:{str(request.args)}".encode()
                ).hexdigest()
                cached_data = self.cache.get(cache_key)

                if cached_data:
                    timestamp, data = cached_data
                    if datetime.utcnow() < timestamp + timedelta(seconds=timeout):
                        return Response(data, 200)

                data = f(*args, **kwargs)
                self.cache[cache_key] = (datetime.utcnow(), data)
                return data

            return decorated_function

        return decorator

    def clear_cache(self) -> None:
        self.cache.clear()
        logger.info("Cache cleared")
