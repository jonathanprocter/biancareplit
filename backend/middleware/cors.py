"""CORS middleware configuration and handling."""
from flask import Flask
from flask_cors import CORS
from typing import List, Optional
from .middleware_config import middleware_config

def setup_cors(app: Flask) -> None:
    """Configure CORS for the Flask application."""
    try:
        CORS(app, resources={
            r"/*": {
                "origins": ["*", "https://*.repl.co", "https://*.repl.dev"],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization", "X-CSRF-Token", "Host"],
                "supports_credentials": True,
                "send_wildcard": True
            }
        })
    except Exception as e:
        app.logger.error(f"Failed to setup CORS: {str(e)}")
        raise
