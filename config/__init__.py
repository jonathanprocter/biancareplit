"""Configuration management for the NCLEX coaching platform."""
import os
import logging
from pathlib import Path
from typing import Dict, Any

# Setup logging
logger = logging.getLogger(__name__)

class Config:
    """Base configuration class."""
    
    # Core Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-change-in-production')
    DEBUG = False
    TESTING = False
    
    # Application settings
    APP_NAME = "NCLEX Coaching Platform"
    APP_VERSION = "1.0.0"
    
    # Database settings
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'max_overflow': 20,
        'pool_timeout': 30,
        'pool_recycle': 1800,
    }
    
    # Security settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SECURE = True
    REMEMBER_COOKIE_HTTPONLY = True

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SESSION_COOKIE_SECURE = False
    REMEMBER_COOKIE_SECURE = False

class ProductionConfig(Config):
    """Production configuration."""
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Log to stderr
        import logging
        from logging import StreamHandler
        file_handler = StreamHandler()
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SESSION_COOKIE_SECURE = False
    REMEMBER_COOKIE_SECURE = False

def get_config():
    """Get configuration based on environment."""
    env = os.getenv('FLASK_ENV', 'development').lower()
    configs = {
        'development': DevelopmentConfig,
        'production': ProductionConfig,
        'testing': TestingConfig
    }
    config_class = configs.get(env, DevelopmentConfig)
    logger.info(f"Using {config_class.__name__} configuration")
    return config_class()

# Make configuration interface available
__all__ = ['Config', 'get_config', 'DevelopmentConfig', 'ProductionConfig', 'TestingConfig']
