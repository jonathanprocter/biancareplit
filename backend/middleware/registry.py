from typing import Dict, List, Optional
import logging
from .base import BaseMiddleware

logger = logging.getLogger(__name__)


class MiddlewareRegistry:
    def __init__(self):
        self._middlewares: Dict[str, BaseMiddleware] = {}
        self._initialized = False

    def register(self, middleware: BaseMiddleware) -> None:
        """Register a middleware component"""
        name = middleware.__class__.__name__
        self._middlewares[name] = middleware
        logger.info(f"Registered middleware: {name}")

    def initialize_all(self, app) -> None:
        """Initialize all registered middleware"""
        if self._initialized:
            return

        for name, middleware in self._middlewares.items():
            try:
                middleware.initialize(app)
                logger.info(f"Initialized middleware: {name}")
            except Exception as e:
                logger.error(f"Failed to initialize {name}: {str(e)}")
                raise

        self._initialized = True

    def get_middleware(self, name: str) -> Optional[BaseMiddleware]:
        """Get middleware by name"""
        return self._middlewares.get(name)

    def get_all(self) -> List[BaseMiddleware]:
        """Get all registered middleware"""
        return list(self._middlewares.values())


middleware_registry = MiddlewareRegistry()
