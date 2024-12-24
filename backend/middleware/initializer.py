"""Middleware initialization system."""

import logging
from typing import Dict, Type, Optional
from flask import Flask
from .base import BaseMiddleware
from .middleware_config import middleware_registry
from .metrics import MetricsMiddleware

logger = logging.getLogger(__name__)

class MiddlewareInitializer:
    """Handles middleware initialization and registration."""

    def __init__(self, app: Optional[Flask] = None):
        self.app = app
        self._registry: Dict[str, Type[BaseMiddleware]] = {
            "metrics": MetricsMiddleware,
        }
        self._initialized: Dict[str, BaseMiddleware] = {}

        if app:
            self.init_app(app)

    def init_app(self, app: Flask) -> None:
        """Initialize all registered middleware with Flask app."""
        try:
            self.app = app
            self._initialize_middleware()
            logger.info("Middleware initialization completed successfully")
        except Exception as e:
            logger.error(f"Failed to initialize middleware: {str(e)}")
            raise

    def _initialize_middleware(self) -> None:
        """Initialize all registered middleware components."""
        if not self.app:
            logger.error("No Flask app configured")
            return

        enabled = middleware_registry.get_enabled_middleware()

        for name in enabled:
            if name not in self._registry:
                logger.warning(f"Middleware {name} is not registered.")
                continue

            try:
                settings = middleware_registry.get_middleware_config(name)
                middleware = self._registry[name](self.app, **settings)
                self._initialized[name] = middleware
                logger.info(f"Initialized middleware: {name}")
            except Exception as e:
                logger.error(f"Failed to initialize middleware {name}: {e}")

    def get_middleware(self, name: str) -> Optional[BaseMiddleware]:
        """Get initialized middleware instance."""
        return self._initialized.get(name)

# Create singleton instance
middleware_initializer = MiddlewareInitializer()