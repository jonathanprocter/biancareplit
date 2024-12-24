"""Base middleware class implementation."""

import logging
from typing import Optional, Any, Dict
from flask import Flask, request

logger = logging.getLogger(__name__)

class BaseMiddleware:
    """Base class for all middleware implementations."""

    def __init__(self, app: Optional[Flask] = None, **kwargs: Dict[str, Any]):
        """Initialize middleware with optional Flask app."""
        self.app = app
        self.config = kwargs
        if app is not None:
            self.init_app(app)

    def init_app(self, app: Flask) -> None:
        """Initialize the middleware with a Flask application.

        This method should be implemented by concrete middleware classes.
        """
        if not isinstance(app, Flask):
            raise TypeError("Expected Flask application instance")
        self.app = app
        self._register_handlers()

    def _register_handlers(self) -> None:
        """Register request handlers with the Flask application."""
        if hasattr(self, 'before_request'):
            self.app.before_request(self.before_request)
        if hasattr(self, 'after_request'):
            self.app.after_request(self.after_request)
        if hasattr(self, 'teardown_request'):
            self.app.teardown_request(self.teardown_request)

    def before_request(self) -> None:
        """Handle operations before each request."""
        pass

    def after_request(self, response: Any) -> Any:
        """Handle operations after each request."""
        return response

    def teardown_request(self, exc: Optional[Exception] = None) -> None:
        """Handle cleanup after each request."""
        pass

    def get_config(self, key: str, default: Any = None) -> Any:
        """Get configuration value with optional default."""
        return self.config.get(key, default)

    def update_config(self, **kwargs: Dict[str, Any]) -> None:
        """Update middleware configuration."""
        self.config.update(kwargs)
        logger.debug(f"Updated middleware config: {self.config}")

    def __repr__(self) -> str:
        """String representation of middleware."""
        return f"{self.__class__.__name__}(app={self.app})"