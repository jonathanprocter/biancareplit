"""Base middleware class implementation."""

import logging
from typing import Any, Callable, Dict, Generic, Optional, TypeVar

from flask import Flask, request

from ..config.unified_config import config_manager

logger = logging.getLogger(__name__)

T = TypeVar("T")


class BaseMiddleware(Generic[T]):
    """Base class for all middleware implementations."""

    def __init__(self, app: Optional[Flask] = None, **kwargs: Dict[str, Any]):
        """Initialize middleware with optional Flask app."""
        self.app: Optional[Flask] = None
        self.config: Dict[str, Any] = {}
        self._initialized: bool = False
        self._setup_logging()

        if kwargs:
            self.update_config(**kwargs)
        if app is not None:
            self.init_app(app)

    @staticmethod
    def _setup_logging() -> None:
        """Setup logging for the middleware."""
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(config_manager.get("LOG_LEVEL", "INFO"))

    def init_app(self, app: Flask) -> None:
        """Initialize the middleware with a Flask application.

        This method should be implemented by concrete middleware classes.
        """
        if not isinstance(app, Flask):
            raise TypeError("Expected Flask application instance")

        if self._initialized:
            logger.warning(f"{self.__class__.__name__} already initialized")
            return

        try:
            self.app = app
            self._register_handlers()
            self._initialized = True
            logger.info(f"{self.__class__.__name__} initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize {self.__class__.__name__}: {str(e)}")
            if app.debug:
                logger.exception("Detailed initialization error:")
            raise

    def _register_handlers(self) -> None:
        """Register request handlers with the Flask application."""
        if not self.app:
            raise RuntimeError("Flask application not initialized")

        try:
            if hasattr(self, "before_request"):
                self.app.before_request_funcs.setdefault(None, []).append(
                    self._wrap_handler(self.before_request)
                )

            if hasattr(self, "after_request"):
                self.app.after_request_funcs.setdefault(None, []).append(
                    self._wrap_handler(self.after_request)
                )

            if hasattr(self, "teardown_request"):
                self.app.teardown_request_funcs.setdefault(None, []).append(
                    self._wrap_handler(self.teardown_request)
                )
        except Exception as e:
            logger.error(f"Failed to register handlers: {str(e)}")
            raise

    def _wrap_handler(self, handler: Callable) -> Callable:
        """Wrap request handlers with error handling."""

        def wrapped(*args: Any, **kwargs: Any) -> Any:
            try:
                return handler(*args, **kwargs)
            except Exception as e:
                logger.error(f"Error in {handler.__name__}: {str(e)}")
                if self.app and self.app.debug:
                    logger.exception(f"Detailed {handler.__name__} error:")
                raise

        return wrapped

    def before_request(self) -> Optional[Any]:
        """Handle operations before each request."""
        pass

    @staticmethod
    def after_request(response: Any) -> Any:
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
        logger.debug(f"Updated {self.__class__.__name__} config: {self.config}")

    def cleanup(self) -> None:
        """Cleanup middleware resources."""
        try:
            self._initialized = False
            self.app = None
            logger.info(f"{self.__class__.__name__} cleaned up successfully")
        except Exception as e:
            logger.error(f"Error during {self.__class__.__name__} cleanup: {str(e)}")
            raise

    def __repr__(self) -> str:
        """String representation of middleware."""
        return f"{self.__class__.__name__}(app={self.app}, initialized={self._initialized})"
