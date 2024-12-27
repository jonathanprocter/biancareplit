"""Middleware initialization system."""

import logging
from typing import Dict, Optional, Type

from flask import Flask

from .base import BaseMiddleware
from .database_middleware import DatabaseMiddleware
from .health import HealthMiddleware
from .metrics import MetricsMiddleware
from .middleware_config import middleware_registry

logger = logging.getLogger(__name__)


class MiddlewareInitializer:
    """Handles middleware initialization and registration."""

    def __init__(self, app: Optional[Flask] = None):
        """Initialize the middleware system."""
        self.app = app
        self._registry: Dict[str, Type[BaseMiddleware]] = {
            "metrics": MetricsMiddleware,
            "health": HealthMiddleware,
            "database": DatabaseMiddleware,
        }
        self._initialized: Dict[str, BaseMiddleware] = {}
        self._setup_logging()

        if app:
            self.init_app(app)

    def _setup_logging(self) -> None:
        """Set up logging for middleware initialization."""
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

    def init_app(self, app: Flask) -> None:
        """Initialize all registered middleware with Flask app."""
        try:
            self.app = app

            # Wait for configuration to be ready
            if not app.config.get("MIDDLEWARE"):
                logger.warning("No middleware configuration found, using defaults")

            # Initialize middleware components in correct order
            enabled = middleware_registry.get_enabled_middleware()

            # Ensure database middleware is initialized first
            if "database" in enabled:
                enabled.remove("database")
                enabled.insert(0, "database")

            for name in enabled:
                try:
                    if name not in self._registry:
                        logger.warning(f"Middleware {name} is not registered.")
                        continue

                    settings = middleware_registry.get_middleware_settings(name)
                    if not settings.get("enabled", True):
                        logger.info(f"Middleware {name} is disabled by configuration")
                        continue

                    middleware = self._registry[name](app, **settings)
                    self._initialized[name] = middleware
                    logger.info(f"Initialized middleware: {name}")
                except Exception as e:
                    logger.error(f"Failed to initialize middleware {name}: {e}")
                    if app.debug:
                        logger.exception("Detailed error trace:")
                    # Continue with other middleware even if one fails
                    continue

            logger.info("Middleware initialization completed successfully")
        except Exception as e:
            logger.error(f"Failed to initialize middleware: {str(e)}")
            if app.debug:
                logger.exception("Detailed error trace:")
            # Don't raise the exception to allow the application to continue
            # with reduced functionality

    def get_middleware(self, name: str) -> Optional[BaseMiddleware]:
        """Get initialized middleware instance."""
        return self._initialized.get(name)

    def cleanup(self) -> None:
        """Cleanup middleware resources."""
        try:
            for name, middleware in list(self._initialized.items()):
                try:
                    if hasattr(middleware, "cleanup") and callable(
                        getattr(middleware, "cleanup")
                    ):
                        middleware.cleanup()
                    self._initialized.pop(name, None)
                except Exception as e:
                    logger.error(f"Error cleaning up middleware {name}: {e}")
            self._initialized.clear()
        except Exception as e:
            logger.error(f"Error during middleware cleanup: {e}")


# Create singleton instance
middleware_initializer = MiddlewareInitializer()
