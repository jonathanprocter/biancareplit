"""Flask application factory and configuration."""

from datetime import datetime
from flask import Flask, jsonify, request
from flask_migrate import Migrate
from flask_cors import CORS
import os
import logging
import psutil
from backend.database.core import db, db_manager
from backend.middleware.initializer import middleware_initializer
from backend.config.unified_config import config_manager
from prometheus_client import make_wsgi_app, CollectorRegistry
from werkzeug.middleware.dispatcher import DispatcherMiddleware

# Configure logging with proper format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)

    try:
        # Initialize configuration first
        config_manager.init_app(app)
        logger.info("Configuration initialized successfully")

        # Initialize CORS
        CORS(app)

        # Initialize database configuration
        if not app.config.get("SQLALCHEMY_DATABASE_URI"):
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise ValueError("DATABASE_URL environment variable must be set")

            # Handle postgres URLs for compatibility
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)

            app.config.update({
                "SQLALCHEMY_DATABASE_URI": database_url,
                "SQLALCHEMY_TRACK_MODIFICATIONS": False,
                "SQLALCHEMY_ENGINE_OPTIONS": {
                    "pool_pre_ping": True,
                    "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
                    "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
                    "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
                    "pool_recycle": 300,
                }
            })

        # Initialize SQLAlchemy first
        db.init_app(app)
        logger.info("SQLAlchemy initialized successfully")

        # Initialize database manager after SQLAlchemy
        if not db_manager.init_app(app):
            logger.error("Failed to initialize database manager")
            raise Exception("Database manager initialization failed")
        logger.info("Database manager initialized successfully")

        # Initialize migrations after database setup
        migrate = Migrate(app, db)
        logger.info("Migrations initialized successfully")

        # Create Prometheus registry
        prometheus_registry = CollectorRegistry()
        logger.info("Prometheus registry created")

        # Verify database connection before proceeding
        with app.app_context():
            try:
                # Test database connection
                db.session.execute('SELECT 1')
                db.session.commit()
                logger.info("Database connection verified")

                # Create tables in development mode
                if app.config.get('FLASK_ENV') == 'development':
                    db.create_all()
                    logger.info("Database tables created successfully")
            except Exception as e:
                logger.error(f"Database verification failed: {str(e)}")
                raise

            # Initialize middleware after database is ready
            middleware_initializer.init_app(app)
            logger.info("Middleware initialized successfully")

        # Add Prometheus WSGI middleware
        app.wsgi_app = DispatcherMiddleware(
            app.wsgi_app, 
            {'/metrics': make_wsgi_app(registry=prometheus_registry)}
        )
        logger.info("Prometheus metrics endpoint configured")

    except Exception as e:
        logger.error(f"Application initialization failed: {str(e)}", exc_info=True)
        raise

    @app.route("/")
    def index():
        """Root endpoint"""
        return jsonify({
            "status": "online",
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat()
        })

    @app.route("/health")
    def health():
        """Health check endpoint"""
        try:
            # Test database connection
            db.session.execute('SELECT 1')
            db.session.commit()

            return jsonify({
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0.0",
                "system": {
                    "cpu_percent": psutil.cpu_percent(),
                    "memory_percent": psutil.virtual_memory().percent,
                },
                "database": "connected"
            }), 200
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return jsonify({
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }), 503

    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

    @app.before_request
    def before_request():
        """Log requests in development"""
        if app.debug:
            logger.info(f"{request.method} {request.path} {request.data}")

    return app

# Create the application instance
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv('PORT', 5000)), debug=True)