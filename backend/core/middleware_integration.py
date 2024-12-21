"""Core middleware integration service."""

from typing import Optional, List
import logging
from flask import Flask, Response
from ..middleware.base import BaseMiddleware
from ..middleware.middleware_config import middleware_registry

logger = logging.getLogger(__name__)


class MiddlewareIntegration:
    """Core middleware integration and orchestration service."""

    def __init__(self, app: Optional[Flask] = None):
        self.app = app
        self.middleware: Dict[str, BaseMiddleware] = {}
        self._initialized = False

    def init_app(self, app: Flask) -> None:
        """Initialize middleware integration with Flask app."""
        if self._initialized:
            return

        self.app = app
        self._register_core_middleware()
        self._setup_request_handlers()
        self._initialized = True
        logger.info("Middleware integration initialized")

    def _register_core_middleware(self) -> None:
        """Register and initialize core middleware components."""
        try:
            from ..middleware.logging import LoggingMiddleware
            from ..middleware.security import SecurityMiddleware
            from ..middleware.error_handler import ErrorHandlerMiddleware
            from ..middleware.request_tracking import RequestTrackingMiddleware

            # Register core middleware with settings from config
            core_middleware = {
                "logging": LoggingMiddleware,
                "security": SecurityMiddleware,
                "error_handler": ErrorHandlerMiddleware,
                "request_tracking": RequestTrackingMiddleware,
            }

            for name, middleware_class in core_middleware.items():
                settings = middleware_registry.get_middleware_settings(name)
                if middleware_registry.is_enabled(name):
                    self.register_middleware(
                        name, middleware_class(self.app, **settings)
                    )

        except Exception as e:
            logger.error(f"Failed to register core middleware: {e}")
            raise

    def register_middleware(self, name: str, middleware: BaseMiddleware) -> None:
        """Register a middleware component."""
        if name in self.middleware:
            logger.warning(f"Middleware {name} already registered, updating...")

        self.middleware[name] = middleware
        logger.info(f"Registered middleware: {name}")

    def _setup_request_handlers(self) -> None:
        """Set up Flask before/after request handlers."""
        if not self.app:
            return

        @self.app.before_request
        def handle_before_request() -> Optional[Response]:
            """Execute before_request handlers in order."""
            for name in middleware_registry.get_middleware_order():
                if name in self.middleware:
                    try:
                        response = self.middleware[name].before_request(Request)
                        if response is not None:
                            return response
                    except Exception as e:
                        logger.error(f"Error in {name} before_request: {e}")

            return None

        @self.app.after_request
        def handle_after_request(response: Response) -> Response:
            """Execute after_request handlers in reverse order."""
            for name in reversed(middleware_registry.get_middleware_order()):
                if name in self.middleware:
                    try:
                        response = self.middleware[name].after_request(response)
                    except Exception as e:
                        logger.error(f"Error in {name} after_request: {e}")

            return response

    def get_middleware(self, name: str) -> Optional[BaseMiddleware]:
        """Get registered middleware by name."""
        return self.middleware.get(name)

    def get_active_middleware(self) -> List[str]:
        """Get list of active middleware names."""
        return list(self.middleware.keys())


middleware_integration = MiddlewareIntegration()
