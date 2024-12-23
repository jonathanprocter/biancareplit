"""Application factory module for the medical education platform."""

from flask import Flask, jsonify
from flask_cors import CORS
import os
import logging
from backend.config.unified_config import config_manager
from backend.database.core import init_db
from backend.middleware.logging_middleware import LoggingMiddleware
from backend.middleware.error_middleware import ErrorMiddleware
from backend.middleware.metrics import MetricsMiddleware
from backend.middleware.health import HealthMiddleware
from backend.routes import api

logger = logging.getLogger(__name__)

def setup_logging():
    """Configure application logging."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

def create_app(env_path=None):
    """Create and configure Flask application."""
    try:
        setup_logging()
        app = Flask(__name__)

        # Initialize configuration
        config_manager.init_app(app)

        # Configure CORS
        CORS(app)

        # Initialize middleware stack
        LoggingMiddleware().init_app(app)
        ErrorMiddleware().init_app(app)
        MetricsMiddleware().init_app(app)
        HealthMiddleware().init_app(app)

        # Initialize database
        init_db(app)

        # Register health check endpoint
        @app.route("/health")
        def health_check():
            return jsonify({"status": "healthy"})

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

# Create application instance
application = create_app()

if __name__ == "__main__":
    application.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")))