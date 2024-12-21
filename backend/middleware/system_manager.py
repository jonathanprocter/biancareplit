import logging
from typing import Dict, List, Any, Optional
from .validation import MiddlewareValidator
from .error_handler import ErrorHandler, handle_middleware_errors

logger = logging.getLogger(__name__)


class MiddlewareSystemManager:
    def __init__(self):
        self.middlewares: Dict[str, Any] = {}
        self.validator = MiddlewareValidator()
        self.error_handler = ErrorHandler()
        self.middleware_order: List[str] = []

        # Register core middleware
        from .security_middleware import SecurityMiddleware
        from .request_validation import RequestValidationMiddleware

        self.register_middleware("security", SecurityMiddleware())
        self.register_middleware("validation", RequestValidationMiddleware())
        self.register_middleware("cache", CacheMiddleware())

    @handle_middleware_errors
    def register_middleware(self, name: str, middleware_class: Any) -> bool:
        """Register a new middleware"""
        if name in self.middlewares:
            logger.warning(f"Middleware {name} already registered")
            return False

        if not self.validator.validate_middleware_module(middleware_class.__module__):
            logger.error(f"Middleware {name} validation failed")
            return False

        self.middlewares[name] = middleware_class()
        self._update_middleware_order()
        return True

    def _update_middleware_order(self):
        """Update middleware execution order based on priority"""
        self.middleware_order = sorted(
            self.middlewares.keys(),
            key=lambda x: getattr(self.middlewares[x], "priority", 0),
        )

    @handle_middleware_errors
    def execute_middleware_chain(self, request: Any) -> Any:
        """Execute middleware chain in order"""
        response = request
        for middleware_name in self.middleware_order:
            middleware = self.middlewares[middleware_name]
            try:
                response = middleware.process_request(response)
            except Exception as e:
                logger.error(f"Middleware {middleware_name} execution failed: {str(e)}")
                return self.error_handler.handle_error(e)
        return response

    def get_middleware(self, name: str) -> Optional[Any]:
        """Get middleware instance by name"""
        return self.middlewares.get(name)

    def remove_middleware(self, name: str) -> bool:
        """Remove middleware from system"""
        if name in self.middlewares:
            del self.middlewares[name]
            self._update_middleware_order()
            return True
        return False
