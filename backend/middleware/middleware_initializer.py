import logging
from typing import Dict, Optional, Type
from flask import Flask
from .base import BaseMiddleware

logger = logging.getLogger(__name__)


class MiddlewareInitializer:
    def __init__(self):
        self._app: Optional[Flask] = None
        self._middleware_registry: Dict[str, Type[BaseMiddleware]] = {}
        self._initialized = False

    def init_app(self, app: Flask) -> None:
        """Initialize all registered middleware with the Flask app"""
        if self._initialized:
            logger.warning("App already initialized")
            return
        self._app = app
        self._initialize_middleware()
        self._initialized = True

    def register(self, name: str, middleware: Type[BaseMiddleware]) -> None:
        """Register a new middleware component"""
        if name in self._middleware_registry:
            logger.warning(f"Middleware {name} already registered")
            return
        self._middleware_registry[name] = middleware

    def _initialize_middleware(self) -> None:
        """Initialize all registered middleware components"""
        if not self._app:
            raise RuntimeError("Flask app not initialized")

        for name, middleware in self._middleware_registry.items():
            try:
                middleware_instance = middleware()
                middleware_instance.init_app(self._app)
                logger.info(f"Initialized middleware: {name}")
            except Exception as e:
                logger.error(
                    f"Failed to initialize middleware {name}: {e}", exc_info=True
                )
                raise

    @property
    def initialized(self) -> bool:
        return self._initialized


middleware_initializer = MiddlewareInitializer()
