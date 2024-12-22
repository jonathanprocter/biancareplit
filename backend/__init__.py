"""Backend package initialization."""

import os
import sys
import logging
from pathlib import Path
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout), logging.FileHandler("logs/app.log")],
)

logger = logging.getLogger(__name__)


def create_app(env: str = None) -> Flask:
    """Create and configure Flask application."""
    try:
        # Create required directories
        for directory in ["instance", "logs", "config"]:
            Path(directory).mkdir(parents=True, exist_ok=True)

        # Load environment variables
        load_dotenv()

        # Create Flask app
        app = Flask(__name__)

        # Set environment
        env = env or os.getenv("FLASK_ENV", "development")
        app.config["ENV"] = env
        app.config["DEBUG"] = env == "development"

        # Initialize CORS
        CORS(app)

        with app.app_context():
            # Initialize configuration
            from .core.config import config_manager

            config_manager.init_app(app)

            # Initialize middleware
            from .core.middleware import middleware_manager

            # Register middleware handlers
            @app.before_request
            def before_request():
                middleware_manager.process_request()

            # Register blueprints
            from .health import health_bp

            app.register_blueprint(health_bp)

            logger.info(f"Application initialized successfully for environment: {env}")
            return app

    except Exception as e:
        logger.error(f"Error creating application: {str(e)}", exc_info=True)
        raise
