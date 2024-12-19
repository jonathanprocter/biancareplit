import os
from pathlib import Path

class DeploymentConfig:
    """Deployment and environment configuration"""
    
    # Base application configuration
    BASE_DIR = Path(__file__).parent.parent
    ENV = os.getenv('FLASK_ENV', 'production')
    DEBUG = False
    HOST = '0.0.0.0'
    PORT = int(os.getenv('PORT', 8080))
    
    # Database configuration
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///app.db')
    
    # Security configuration
    SECRET_KEY = os.getenv('SECRET_KEY', os.urandom(24).hex())
    CORS_ORIGINS = [
        "https://ai-bot-template-1.jonathanprocter.repl.co",
        "https://ai-bot-template.jonathanprocter.repl.co",
        "http://localhost:3002"
    ]
    
    # Application features
    ENABLE_ANALYTICS = True
    ENABLE_CACHING = True
    
    # API configuration
    API_VERSION = '1.0'
    API_PREFIX = '/api'
    
    # Performance tuning
    WORKERS = int(os.getenv('GUNICORN_WORKERS', 4))
    THREADS = int(os.getenv('GUNICORN_THREADS', 2))
    TIMEOUT = int(os.getenv('GUNICORN_TIMEOUT', 120))
    
    @classmethod
    def init_app(cls, app):
        """Initialize application with deployment settings"""
        app.config.from_object(cls)
        
        # Set up logging
        if not app.debug and not app.testing:
            cls._configure_logging(app)
            
        # Initialize deployment-specific handlers
        cls._configure_handlers(app)
            
    @staticmethod
    def _configure_logging(app):
        import logging
        from logging.handlers import RotatingFileHandler
        
        logging.basicConfig(level=logging.INFO)
        
        if not os.path.exists('logs'):
            os.mkdir('logs')
            
        file_handler = RotatingFileHandler(
            'logs/application.log',
            maxBytes=1024 * 1024,  # 1MB
            backupCount=10
        )
        
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s '
            '[in %(pathname)s:%(lineno)d]'
        ))
        
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('Application startup')

    @staticmethod
    def _configure_handlers(app):
        @app.after_request
        def after_request(response):
            response.headers.add(
                'Access-Control-Allow-Headers',
                'Content-Type,Authorization'
            )
            response.headers.add(
                'Access-Control-Allow-Methods',
                'GET,PUT,POST,DELETE,OPTIONS'
            )
            return response
