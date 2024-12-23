"""CORS middleware configuration and handling."""

from flask import Flask
from flask_cors import CORS
from typing import List, Optional
from .middleware_config import middleware_config


def setup_cors(app: Flask) -> None:
    """Configure CORS for the Flask application."""
    try:
        CORS(
            app,
            resources={
                r"/*": {
                    "origins": middleware_config.get("origins", "*"),
                    "methods": middleware_config.get(
                        "methods", ["GET", "POST", "PUT", "DELETE"]
                    ),
                    "allow_headers": middleware_config.get(
                        "allow_headers", ["Content-Type"]
                    ),
                    "supports_credentials": middleware_config.get(
                        "supports_credentials", False
                    ),
                    "send_wildcard": middleware_config.get("send_wildcard", False),
                }
            },
        )
    except Exception as e:
        app.logger.error(f"Failed to setup CORS: {str(e)}")
        raise
    else:
        app.logger.info("CORS setup successfully.")
