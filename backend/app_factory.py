"""Application factory module for the medical education platform."""

from flask import Flask, jsonify
from flask_cors import CORS
import logging
from backend.config.unified_config import config_manager
from backend.database.db_config_manager import db_manager
from backend.middleware.logging_middleware import LoggingMiddleware
from backend.middleware.error_middleware import ErrorMiddleware
from backend.middleware.metrics import MetricsMiddleware
from backend.middleware.health import HealthMiddleware
from backend.routes import api

logger = logging.getLogger(__name__)

def create_app(env_path=None):
    """Create and configure Flask application with enhanced error handling."""
    try:
        app = Flask(__name__)

        # Initialize configuration
        config_manager.init_app(app)

        # Configure CORS
        CORS(app, resources={r"/*": {"origins": config_manager.get("CORS_ORIGINS", "*")}})

        # Initialize middleware stack before database
        LoggingMiddleware().init_app(app)
        ErrorMiddleware().init_app(app)
        MetricsMiddleware().init_app(app)
        HealthMiddleware().init_app(app)

        # Initialize database with proper error handling
        try:
            db_manager.init_app(app)
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            if app.config['ENV'] == 'production':
                raise
            logger.warning("Starting in limited functionality mode")

        # Add database health check endpoint
        @app.route("/health/db")
        def db_health():
            try:
                if db_manager.verify_connection(app):
                    return jsonify({
                        "status": "healthy",
                        "message": "Database connection verified"
                    })
                return jsonify({
                    "status": "error",
                    "message": "Database connection failed"
                }), 503
            except Exception as e:
                logger.error(f"Database health check failed: {str(e)}")
                return jsonify({
                    "status": "error",
                    "message": str(e) if app.debug else "Database connection error"
                }), 503

        # Register error handlers
        @app.errorhandler(404)
        def not_found(error):
            return jsonify({
                "error": "Not Found",
                "message": str(error),
                "status": 404
            }), 404

        @app.errorhandler(500)
        def server_error(error):
            logger.error(f"Internal server error: {str(error)}")
            return jsonify({
                "error": "Internal Server Error",
                "message": "An unexpected error occurred",
                "status": 500
            }), 500

        # Register blueprints
        app.register_blueprint(api.bp)

        logger.info("Application initialized successfully")
        return app

    except Exception as e:
        logger.error(f"Failed to create application: {str(e)}")
        raise

def run_app():
    """Run the application."""
    app = create_app()
    host = config_manager.get("HOST", "0.0.0.0")
    port = config_manager.get("PORT", 5000)
    app.run(host=host, port=port)

if __name__ == "__main__":
    run_app()