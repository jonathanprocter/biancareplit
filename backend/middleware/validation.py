import logging
from typing import Dict, Any, List
from pathlib import Path
import importlib

logger = logging.getLogger(__name__)


class MiddlewareValidator:
    def __init__(self):
        self.required_methods = ["process_request", "process_response"]
        self.required_attributes = ["name", "priority"]

    def validate_middleware_module(self, module_path: str) -> bool:
        """Validate a middleware module"""
        try:
            module = importlib.import_module(module_path)
            middleware_class = None

            for item in dir(module):
                obj = getattr(module, item)
                if isinstance(obj, type) and item.endswith("Middleware"):
                    middleware_class = obj
                    break

            if not middleware_class:
                logger.error(f"No middleware class found in {module_path}")
                return False

            # Validate required methods
            for method in self.required_methods:
                if not hasattr(middleware_class, method):
                    logger.error(f"Missing required method {method} in {module_path}")
                    return False

            # Validate required attributes
            instance = middleware_class()
            for attr in self.required_attributes:
                if not hasattr(instance, attr):
                    logger.error(f"Missing required attribute {attr} in {module_path}")
                    return False

            return True
        except Exception as e:
            logger.error(f"Error validating middleware {module_path}: {str(e)}")
            return False

    def validate_middleware_config(self, config: Dict[str, Any]) -> bool:
        """Validate middleware configuration"""
        try:
            required_fields = ["enabled", "order", "settings"]

            for middleware_name, settings in config.items():
                for field in required_fields:
                    if field not in settings:
                        logger.error(
                            f"Missing required field '{field}' in middleware '{middleware_name}'"
                        )
                        return False

                if not isinstance(settings["enabled"], bool):
                    logger.error(
                        f"'enabled' must be boolean in middleware '{middleware_name}'"
                    )
                    return False

                if not isinstance(settings["order"], int):
                    logger.error(
                        f"'order' must be integer in middleware '{middleware_name}'"
                    )
                    return False

            return True
        except Exception as e:
            logger.error(f"Error validating middleware config: {str(e)}")
            return False
