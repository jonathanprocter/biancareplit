"""Flask application factory and configuration."""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging
from datetime import datetime
from backend.database.core import db, db_manager
from backend.middleware.initializer import middleware_initializer
from backend.config.unified_config import config_manager
from prometheus_client import make_wsgi_app, CollectorRegistry
from werkzeug.middleware.dispatcher import DispatcherMiddleware
from sqlalchemy import text

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
        logger.info("CORS initialized")

        # Initialize database
        if not db_manager.init_app(app):
            logger.error("Failed to initialize database")
            raise RuntimeError("Database initialization failed")
        logger.info("Database initialized successfully")

        # Initialize middleware
        middleware_initializer.init_app(app)
        logger.info("Middleware initialized successfully")

        # Configure Prometheus metrics
        prometheus_registry = CollectorRegistry()
        app.wsgi_app = DispatcherMiddleware(
            app.wsgi_app,
            {'/metrics': make_wsgi_app(registry=prometheus_registry)}
        )
        logger.info("Prometheus metrics configured")

        @app.route("/")
        def index():
            return jsonify({
                "status": "online",
                "version": "1.0.0",
                "timestamp": datetime.utcnow().isoformat()
            })

        @app.route("/health")
        def health():
            try:
                # Verify database connection
                db.session.execute(text("SELECT 1"))
                db.session.commit()

                return jsonify({
                    "status": "healthy",
                    "timestamp": datetime.utcnow().isoformat(),
                    "version": "1.0.0",
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
            if app.debug:
                logger.info(f"{request.method} {request.path}")

        return app

    except Exception as e:
        logger.error(f"Application initialization failed: {str(e)}")
        raise

# Create the application instance
app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)