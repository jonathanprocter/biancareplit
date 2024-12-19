"""Default configuration for the application."""
import os
from pathlib import Path

# Base configuration
DEBUG = False
TESTING = False
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev')

# Database
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Security
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
PERMANENT_SESSION_LIFETIME = 3600

# Logging
LOG_LEVEL = 'INFO'
LOG_FORMAT = '%(asctime)s [%(levelname)s] %(name)s: %(message)s'

# Cache
CACHE_TYPE = 'simple'
CACHE_DEFAULT_TIMEOUT = 300

# Paths
BASE_DIR = Path(__file__).parent.parent
CONFIG_PATH = BASE_DIR / 'config'
MIDDLEWARE_CONFIG_PATH = CONFIG_PATH / 'middleware.yaml'

# Metrics
PROMETHEUS_METRICS_PATH = '/metrics'
