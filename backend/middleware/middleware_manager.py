
import logging
from typing import List
from flask import Flask
from .base import BaseMiddleware
from .error_middleware import ErrorHandlerMiddleware
from .logging_middleware import LoggingMiddleware
from .request_tracking import RequestTrackingMiddleware

logger = logging.getLogger(__name__)

class MiddlewareManager:
    def __init__(self):
        self.middlewares: List[BaseMiddleware] = []
        self._initialized = False
        
    def register(self, middleware: BaseMiddleware) -> None:
        if not isinstance(middleware, BaseMiddleware):
            raise TypeError("Middleware must inherit from BaseMiddleware")
        self.middlewares.append(middleware)
        logger.info(f"Registered middleware: {middleware.__class__.__name__}")
        
    def initialize_app(self, app: Flask) -> None:
        if self._initialized:
            logger.warning("Middleware manager already initialized")
            return

        for middleware in self.middlewares:
            try:
                middleware.init_app(app)
                logger.info(f"Initialized middleware: {middleware.__class__.__name__}")
            except Exception as e:
                logger.error(f"Failed to initialize middleware {middleware.__class__.__name__}: {str(e)}")
                raise

        self._initialized = True

middleware_manager = MiddlewareManager()
middleware_manager.register(ErrorHandlerMiddleware())
middleware_manager.register(LoggingMiddleware())
middleware_manager.register(RequestTrackingMiddleware())
