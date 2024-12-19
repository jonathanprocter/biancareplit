"""Environment-specific configurations for the NCLEX coaching platform."""
from .base_config import BaseConfig

class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""
    DEBUG = True
    TESTING = False
    
    # Development-specific middleware settings
    MIDDLEWARE_CONFIG = {
        **BaseConfig.MIDDLEWARE_CONFIG,
        'logging': {
            'enabled': True,
            'level': 'DEBUG',
            'format': '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
        }
    }
    
    # Development database settings
    SQLALCHEMY_ECHO = True

class ProductionConfig(BaseConfig):
    """Production environment configuration."""
    DEBUG = False
    TESTING = False
    
    # Production-specific middleware settings
    MIDDLEWARE_CONFIG = {
        **BaseConfig.MIDDLEWARE_CONFIG,
        'security': {
            'enabled': True,
            'rate_limit': "60 per minute"
        }
    }
    
    # Production database settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,
        'max_overflow': 40,
        'pool_timeout': 60,
        'pool_recycle': 3600,
    }

class TestingConfig(BaseConfig):
    """Testing environment configuration."""
    DEBUG = True
    TESTING = True
    
    # Test database settings
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    
    # Testing-specific middleware settings
    MIDDLEWARE_CONFIG = {
        **BaseConfig.MIDDLEWARE_CONFIG,
        'logging': {
            'enabled': True,
            'level': 'DEBUG'
        },
        'performance': {
            'enabled': False
        }
    }

# Configuration mapping
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config(config_name: str = None):
    """Get configuration class by name."""
    return config_by_name.get(config_name or 'default')
