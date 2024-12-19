from flask_caching import Cache
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Initialize cache with default config
cache = Cache()

def init_cache(app):
    """Initialize caching with the application"""
    try:
        # Try to use Redis if available
        redis_config = {
            'CACHE_TYPE': 'redis',
            'CACHE_REDIS_HOST': app.config.get('REDIS_HOST', 'localhost'),
            'CACHE_REDIS_PORT': app.config.get('REDIS_PORT', 6379),
            'CACHE_REDIS_DB': app.config.get('REDIS_DB', 0),
            'CACHE_DEFAULT_TIMEOUT': app.config.get('CACHE_TIMEOUT', 300)
        }
        cache.init_app(app, config=redis_config)
        # Test Redis connection
        with app.app_context():
            cache.set('test_key', 'test_value', timeout=1)
            cache.get('test_key')
        logger.info("Cache initialized with Redis backend")
    except Exception as e:
        # Fall back to simple cache if Redis is not available
        logger.warning(f"Redis cache initialization failed: {str(e)}. Falling back to simple cache.")
        cache.init_app(app, config={
            'CACHE_TYPE': 'simple',
            'CACHE_DEFAULT_TIMEOUT': 300
        })

def cached_response(timeout=300):
    """Cache decorator with custom timeout"""
    def decorator(f):
        def wrapper(*args, **kwargs):
            cache_key = f"{f.__name__}:{str(args)}:{str(kwargs)}"
            response = cache.get(cache_key)
            if response is None:
                response = f(*args, **kwargs)
                cache.set(cache_key, response, timeout=timeout)
            return response
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator
