"""Development configuration."""

from .default import *

DEBUG = True
TESTING = False
ENV = "development"

# Security settings for development
SESSION_COOKIE_SECURE = False
PERMANENT_SESSION_LIFETIME = 3600

# Logging settings
LOG_LEVEL = "DEBUG"

# Cache settings
CACHE_TYPE = "simple"
CACHE_DEFAULT_TIMEOUT = 300
