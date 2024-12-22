import os
from dotenv import load_dotenv
from functools import lru_cache

# Load environment variables
load_dotenv()


class Config:
    """Base configuration class"""

    DATABASE_URL = os.getenv("DATABASE_URL")
    SECRET_KEY = os.getenv("SECRET_KEY") or os.urandom(32)

    # Redis configuration with fallback
    REDIS_ENABLED = os.getenv("REDIS_ENABLED", "true").lower() == "true"
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
    REDIS_MAX_RETRIES = int(os.getenv("REDIS_MAX_RETRIES", 3))
    REDIS_RETRY_DELAY = int(os.getenv("REDIS_RETRY_DELAY", 1000))

    # Cache configuration with dynamic type
    CACHE_TYPE = os.getenv("CACHE_TYPE", "redis" if REDIS_ENABLED else "simple")
    CACHE_DEFAULT_TIMEOUT = int(os.getenv("CACHE_TIMEOUT", 300))
    CACHE_KEY_PREFIX = os.getenv("CACHE_PREFIX", "nclex_cache")
    CACHE_REDIS_FALLBACK = os.getenv("CACHE_REDIS_FALLBACK", "true").lower() == "true"

    @classmethod
    def get_cache_config(cls):
        """Get cache configuration with fallback options"""
        if cls.CACHE_TYPE == "redis" and cls.CACHE_REDIS_FALLBACK:
            try:
                import redis

                client = redis.Redis(
                    host=cls.REDIS_HOST,
                    port=cls.REDIS_PORT,
                    password=cls.REDIS_PASSWORD,
                    socket_timeout=2,
                )
                client.ping()
            except Exception as e:
                print(f"Redis connection failed: {e}. Falling back to simple cache.")
                return {"CACHE_TYPE": "simple"}

        return {
            "CACHE_TYPE": cls.CACHE_TYPE,
            "CACHE_DEFAULT_TIMEOUT": cls.CACHE_DEFAULT_TIMEOUT,
            "CACHE_KEY_PREFIX": cls.CACHE_KEY_PREFIX,
            "CACHE_REDIS_HOST": cls.REDIS_HOST,
            "CACHE_REDIS_PORT": cls.REDIS_PORT,
            "CACHE_REDIS_PASSWORD": cls.REDIS_PASSWORD,
        }

    # Security settings
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600))

    # Analytics settings
    ANALYTICS_SAMPLE_RATE = float(os.getenv("ANALYTICS_SAMPLE_RATE", 100))
    ANALYTICS_BUFFER_SIZE = int(os.getenv("ANALYTICS_BUFFER_SIZE", 100))

    @classmethod
    def validate(cls):
        """Validate required configuration values"""
        required_settings = [
            ("DATABASE_URL", cls.DATABASE_URL),
            ("SECRET_KEY", cls.SECRET_KEY),
        ]

        missing = [name for name, value in required_settings if not value]

        if missing:
            raise ValueError(
                f"Missing required configuration values: {', '.join(missing)}"
            )

        return True


class DevelopmentConfig(Config):
    """Development configuration"""

    DEBUG = True
    DEVELOPMENT = True
    SQLALCHEMY_TRACK_MODIFICATIONS = True


class ProductionConfig(Config):
    """Production configuration"""

    DEBUG = False
    DEVELOPMENT = False
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class TestingConfig(Config):
    """Testing configuration"""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


@lru_cache(maxsize=None)
def get_config():
    """Get configuration based on environment"""
    env = os.getenv("FLASK_ENV", "development")
    configs = {
        "development": DevelopmentConfig,
        "production": ProductionConfig,
        "testing": TestingConfig,
    }
    return configs.get(env, DevelopmentConfig)
