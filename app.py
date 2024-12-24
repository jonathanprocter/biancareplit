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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)

    # Initialize configuration first
    try:
        config_manager.init_app(app)
        logger.info("Configuration initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize configuration: {str(e)}")
        raise

    # Initialize extensions with proper error handling
    CORS(app)

    # Initialize database first
    try:
        # Initialize Flask-SQLAlchemy
        db.init_app(app)

        # Initialize database manager
        if not db_manager.init_app(app):
            raise Exception("Failed to initialize database manager")

        # Initialize migrations after database
        migrate = Migrate(app, db)
        logger.info("Database and migrations initialized successfully")

    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}", exc_info=True)
        raise

    # Create Prometheus registry
    prometheus_registry = CollectorRegistry()
    logger.info("Prometheus registry created")

    try:
        # Initialize database tables within app context
        with app.app_context():
            # Verify database connection before creating tables
            db.session.execute('SELECT 1')
            db.session.commit()
            logger.info("Database connection verified")

            # Only create tables in development
            if app.config.get('FLASK_ENV') == 'development':
                db.create_all()
                logger.info("Database tables created successfully")

            # Then initialize middleware
            middleware_initializer.init_app(app)
            logger.info("Middleware initialized successfully")

    except Exception as e:
        logger.error(f"Failed during initialization: {str(e)}", exc_info=True)
        raise

    # Add Prometheus WSGI middleware
    app.wsgi_app = DispatcherMiddleware(
        app.wsgi_app, 
        {'/metrics': make_wsgi_app(registry=prometheus_registry)}
    )
    logger.info("Prometheus metrics endpoint configured")

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
            logger.info(f"{request.method} {request.path}")

    return app

# Create the application instance
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv('PORT', 5000)), debug=True)