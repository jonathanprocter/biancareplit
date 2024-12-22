from flask import Flask, jsonify
from flask_cors import CORS
import os
import logging
from backend.config.unified_config import config_manager
from backend.database.core import init_db
from backend.routes import api

logger = logging.getLogger(__name__)


def setup_logging():
    """Configure basic logging."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


def create_app(env_path=None):
    """Create Flask application"""
    setup_logging()
    app = Flask(__name__)

    # Optimize for production
    app.config["PROPAGATE_EXCEPTIONS"] = True
    app.config["JSONIFY_PRETTYPRINT_REGULAR"] = False
    app.config["JSON_SORT_KEYS"] = False

    # Basic configuration
    from .monitoring.metrics_collector import metrics_collector
    from .routes.monitoring import bp as monitoring_bp

    app.before_request(metrics_collector.before_request)
    app.after_request(metrics_collector.after_request)
    app.register_blueprint(monitoring_bp, url_prefix="/api/monitoring")

    app.config.update(
        {
            "ENV": os.getenv("FLASK_ENV", "development"),
            "DEBUG": os.getenv("FLASK_DEBUG", "1") == "1",
            "SECRET_KEY": os.getenv("SECRET_KEY", os.urandom(24).hex()),
            "SQLALCHEMY_DATABASE_URI": os.getenv("DATABASE_URL", "sqlite:///app.db"),
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        }
    )

    # Configure CORS
    CORS(app)

    try:
        # Initialize middleware
        from backend.middleware.registry import middleware_registry
        from backend.middleware.auth_middleware import AuthMiddleware
        from backend.middleware.error_middleware import ErrorMiddleware
        from backend.middleware.metrics_middleware import MetricsMiddleware

        middleware_registry.initialize_all(app)
        AuthMiddleware(app)
        ErrorMiddleware(app)
        metrics_middleware = MetricsMiddleware()
        metrics_middleware.init_app(app)

        # Initialize database
        init_db(app)

        # Register blueprints
        from .routes import api, monitoring

        app.register_blueprint(api.bp)
        app.register_blueprint(monitoring.bp, url_prefix="/monitoring")

        @app.route("/health")
        def health_check():
            return jsonify({"status": "healthy"})

        @app.route("/")
        def root():
            return jsonify({"status": "ok"})

        return app
    except Exception as e:
        logger.error(f"Failed to create app: {str(e)}")
        raise


application = create_app()

if __name__ == "__main__":
    application.run(host="0.0.0.0", port=8080)
