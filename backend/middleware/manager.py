"""Middleware management system."""

import logging
from typing import Any, Dict, List, Optional, Type

from flask import Flask, current_app, g, request

from ..config.unified_config import ConfigurationError, config_manager
from .base import BaseMiddleware
from .middleware_config import middleware_registry

logger = logging.getLogger(__name__)


class MiddlewareManager:
    """Manages middleware initialization and execution."""

    def __init__(self, app: Optional[Flask] = None):
        self._middleware: Dict[str, BaseMiddleware] = {}
        self._registry: Dict[str, Type[BaseMiddleware]] = {}
        self._execution_order: List[str] = []
        self._initialized = False
        if app:
            self.init_app(app)

    def register(self, name: str, middleware_class: Type[BaseMiddleware]) -> None:
        """Register middleware class with validation."""
        try:
            if not issubclass(middleware_class, BaseMiddleware):
                raise TypeError(f"Middleware {name} must inherit from BaseMiddleware")

            if name in self._registry:
                logger.warning(
                    f"Middleware {name} is already registered, will be overwritten"
                )

            self._registry[name] = middleware_class
            logger.debug(f"Registered middleware: {name}")

        except Exception as e:
            logger.error(f"Failed to register middleware {name}: {str(e)}")
            raise

    def init_app(self, app: Flask) -> None:
        """Initialize middleware with Flask app and proper error handling."""
        if self._initialized:
            logger.warning("Middleware manager already initialized")
            return

        try:
            # Validate middleware configuration
            if not app.config.get("MIDDLEWARE"):
                config = config_manager.get("MIDDLEWARE", {})
                if not config:
                    logger.warning("No middleware configuration found, using defaults")
                    config = {"metrics": {"enabled": True}, "health": {"enabled": True}}
                app.config["MIDDLEWARE"] = config

            enabled_middleware = middleware_registry.get_enabled_middleware()
            logger.info(f"Initializing middleware: {enabled_middleware}")

            # Initialize middleware in correct order
            for name in enabled_middleware:
                try:
                    if name not in self._registry:
                        logger.warning(f"Middleware {name} not found in registry")
                        continue

                    settings = middleware_registry.get_middleware_settings(name)
                    if not settings.get("enabled", True):
                        logger.info(f"Middleware {name} is disabled by configuration")
                        continue

                    middleware = self._registry[name](app)
                    if settings:
                        middleware.update_config(**settings)

                    self._middleware[name] = middleware
                    self._execution_order.append(name)

                    logger.info(f"Initialized middleware: {name}")

                except Exception as e:
                    logger.error(
                        f"Failed to initialize middleware {name}: {e}", exc_info=True
                    )
                    # Continue with other middleware even if one fails
                    continue

            # Register middleware handlers after all middleware is initialized
            self._register_handlers(app)
            self._initialized = True
            logger.info("Middleware initialization completed successfully")

        except Exception as e:
            logger.error(
                f"Failed to initialize middleware manager: {str(e)}", exc_info=True
            )
            raise

    def _register_handlers(self, app: Flask) -> None:
        """Register all middleware handlers in the correct order."""
        for name in self._execution_order:
            middleware = self._middleware[name]

            if hasattr(middleware, "before_request"):
                app.before_request_funcs.setdefault(None, []).append(
                    middleware.before_request
                )

            if hasattr(middleware, "after_request"):
                app.after_request_funcs.setdefault(None, []).append(
                    middleware.after_request
                )

            if hasattr(middleware, "teardown_request"):
                app.teardown_request_funcs.setdefault(None, []).append(
                    middleware.teardown_request
                )

    def get_middleware(self, name: str) -> Optional[BaseMiddleware]:
        """Get initialized middleware instance with validation."""
        if name not in self._middleware:
            logger.warning(f"Middleware {name} not found")
            return None
        return self._middleware.get(name)

    def cleanup(self) -> None:
        """Cleanup middleware resources with proper error handling."""
        for name, middleware in list(self._middleware.items()):
            try:
                if hasattr(middleware, "cleanup") and callable(
                    getattr(middleware, "cleanup")
                ):
                    middleware.cleanup()
                self._middleware.pop(name, None)
            except Exception as e:
                logger.error(f"Error cleaning up middleware {name}: {str(e)}")

        self._execution_order.clear()
        self._initialized = False

    def get_execution_order(self) -> List[str]:
        """Get current middleware execution order."""
        return self._execution_order.copy()

    def is_initialized(self) -> bool:
        """Check if middleware manager is initialized."""
        return self._initialized


# Create singleton instance
middleware_manager = MiddlewareManager()
