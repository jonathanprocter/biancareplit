import redis
from redis.exceptions import ConnectionError, TimeoutError
import logging
import time
from typing import Optional, Any
import json


class RedisManager:
    """Redis cache management with fallback"""

    def __init__(self, app=None):
        self.logger = logging.getLogger(__name__)
        self.redis_client = None
        self.fallback_cache = {}
        self.connected = False
        self.connection_attempts = 0
        self.max_retries = 3

        if app:
            self.init_app(app)

    def init_app(self, app):
        """Initialize Redis with Flask app"""
        try:
            redis_url = app.config.get("REDIS_URL")
            if not redis_url:
                # Try to construct URL from individual settings
                redis_host = app.config.get("REDIS_HOST", "localhost")
                redis_port = app.config.get("REDIS_PORT", 6379)
                redis_db = app.config.get("REDIS_DB", 0)
                redis_password = app.config.get("REDIS_PASSWORD", "")

                if redis_password:
                    redis_url = f"redis://:{redis_password}@{redis_host}:{redis_port}/{redis_db}"
                else:
                    redis_url = f"redis://{redis_host}:{redis_port}/{redis_db}"

            # Initialize Redis connection with retries
            for _ in range(self.max_retries):
                try:
                    self.redis_client = redis.from_url(
                        redis_url,
                        socket_timeout=5,
                        socket_connect_timeout=5,
                        retry_on_timeout=True,
                    )
                    self.redis_client.ping()
                    self.connected = True
                    self.logger.info("Redis connection established")
                    break
                except (ConnectionError, TimeoutError) as e:
                    self.connection_attempts += 1
                    if self.connection_attempts >= self.max_retries:
                        self.logger.warning(
                            f"Redis connection failed after {self.max_retries} attempts: {str(e)}. "
                            "Using fallback cache."
                        )
                        self.connected = False
                        break
                    self.logger.info(
                        f"Redis connection attempt {self.connection_attempts} failed, retrying..."
                    )
                    time.sleep(1)
        except Exception as e:
            self.logger.error(f"Failed to initialize Redis: {str(e)}")
            self.connected = False

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache with fallback"""
        try:
            if self.connected and self.redis_client:
                value = self.redis_client.get(key)
                return json.loads(value) if value else None
            return self.fallback_cache.get(key)
        except Exception as e:
            self.logger.error(f"Cache get error: {str(e)}")
            return self.fallback_cache.get(key)

    def set(self, key: str, value: Any, timeout: int = 300) -> bool:
        """Set value in cache with fallback"""
        try:
            serialized_value = json.dumps(value)
            if self.connected and self.redis_client:
                return bool(self.redis_client.setex(key, timeout, serialized_value))
            self.fallback_cache[key] = value
            return True
        except Exception as e:
            self.logger.error(f"Cache set error: {str(e)}")
            self.fallback_cache[key] = value
            return False

    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        try:
            if self.connected and self.redis_client:
                return bool(self.redis_client.delete(key))
            if key in self.fallback_cache:
                del self.fallback_cache[key]
                return True
            return False
        except Exception as e:
            self.logger.error(f"Cache delete error: {str(e)}")
            return False
