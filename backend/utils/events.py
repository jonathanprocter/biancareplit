from typing import Dict, Any, Callable, List
import logging
import asyncio


class EventEmitter:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.handlers: Dict[str, List[Callable]] = {}
        self.middleware: List[Callable] = []

    def on(self, event: str) -> Callable:
        """
        Register an event handler using decorator syntax
        """

        def decorator(handler: Callable) -> Callable:
            if event not in self.handlers:
                self.handlers[event] = []
            self.handlers[event].append(handler)
            return handler

        return decorator

    def remove_listener(self, event: str, handler: Callable) -> None:
        """Remove a specific event handler"""
        if event in self.handlers:
            self.handlers[event] = [h for h in self.handlers[event] if h != handler]

    def use_middleware(self, middleware: Callable) -> None:
        """Add middleware for event processing"""
        self.middleware.append(middleware)

    async def emit(self, event: str, data: Any = None) -> None:
        """Emit an event with optional data"""
        if event not in self.handlers:
            return

        try:
            processed_data = await self._process_middleware(event, data)
        except Exception as e:
            self.logger.error(f"Middleware processing error: {str(e)}")
            processed_data = data

        tasks = []
        for handler in self.handlers[event]:
            try:
                if asyncio.iscoroutinefunction(handler):
                    task = asyncio.create_task(
                        handler(processed_data), name=f"event_handler_{event}"
                    )
                else:
                    task = asyncio.create_task(
                        asyncio.to_thread(handler, processed_data),
                        name=f"sync_handler_{event}",
                    )
                tasks.append(task)
            except Exception as e:
                self.logger.error(
                    f"Handler creation error for event {event}: {str(e)}",
                    exc_info=True,
                )

        if tasks:
            try:
                await asyncio.gather(*tasks, return_exceptions=True)
            except Exception as e:
                self.logger.error(
                    f"Handler execution error for event {event}: {str(e)}",
                    exc_info=True,
                )

    async def _process_middleware(self, event: str, data: Any) -> Any:
        """Process data through middleware chain"""
        processed_data = data

        for middleware in self.middleware:
            try:
                if asyncio.iscoroutinefunction(middleware):
                    processed_data = await middleware(event, processed_data)
                else:
                    processed_data = middleware(event, processed_data)
            except Exception as e:
                self.logger.error(f"Middleware error: {str(e)}")
                raise

        return processed_data

    def clear_all(self) -> None:
        """Clear all event handlers and middleware"""
        self.handlers = {}
        self.middleware = []

    def get_handler_count(self, event: str) -> int:
        """Get count of handlers for an event"""
        return len(self.handlers.get(event, []))
