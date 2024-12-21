"""Middleware management system."""

import logging
from typing import Dict, List, Type
from flask import Flask
from .base import BaseMiddleware
from .middleware_config import middleware_registry

logger = logging.getLogger(__name__)


class MiddlewareManager:
    """Manages middleware initialization and execution."""

    def __init__(self, app: Flask = None):
        self._middleware: Dict[str, BaseMiddleware] = {}
        self._registry: Dict[str, Type[BaseMiddleware]] = {}
        if app:
            self.init_app(app)

    def register(self, name: str, middleware_class: Type[BaseMiddleware]) -> None:
        """Register middleware class."""
        self._registry[name] = middleware_class
        logger.debug(f"Registered middleware: {name}")

    def init_app(self, app: Flask) -> None:
        """Initialize middleware with Flask app."""
        enabled_middleware = middleware_registry.get_enabled_middleware()

        for name in enabled_middleware:
            if name not in self._registry:
                logger.warning(f"Middleware {name} not found in registry")
                continue

            try:
                settings = middleware_registry.get_middleware_settings(name)
                middleware = self._registry[name](app, **settings)
                self._middleware[name] = middleware

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

                logger.info(f"Initialized middleware: {name}")
            except Exception as e:
                logger.error(f"Failed to initialize middleware {name}: {e}")

    def get_middleware(self, name: str) -> BaseMiddleware:
        """Get initialized middleware instance."""
        return self._middleware.get(name)


middleware_manager = MiddlewareManager()
