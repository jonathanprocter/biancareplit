
import logging
from typing import Dict, Any, List
from pathlib import Path
import importlib
import inspect

logger = logging.getLogger(__name__)

class SystemVerifier:
    def __init__(self, middleware_path: str = "backend.middleware"):
        self.middleware_path = middleware_path
        self.required_methods = ['process_request', 'process_response']

    def verify_middleware(self, middleware_names: List[str]) -> bool:
        """Verify middleware implementations"""
        try:
            for name in middleware_names:
                module_path = f"{self.middleware_path}.{name}"
                try:
                    module = importlib.import_module(module_path)
                except ImportError as e:
                    logger.error(f"Failed to import middleware {name}: {str(e)}")
                    return False

                # Find middleware class
                middleware_class = None
                for item in dir(module):
                    obj = getattr(module, item)
                    if inspect.isclass(obj) and item.endswith('Middleware'):
                        middleware_class = obj
                        break

                if not middleware_class:
                    logger.error(f"No middleware class found in {name}")
                    return False

                # Verify required methods
                for method in self.required_methods:
                    if not hasattr(middleware_class, method):
                        logger.error(f"Missing required method {method} in {name}")
                        return False

            logger.info("All middleware verified successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error during middleware verification: {str(e)}")
            return False

    def validate_dependencies(self, config: Dict[str, Any]) -> bool:
        """Validate middleware dependencies"""
        try:
            dependency_graph = {}
            for name, settings in config.items():
                dependencies = settings.get('dependencies', [])
                dependency_graph[name] = dependencies

            # Check for circular dependencies
            visited = set()
            temp_visited = set()

            def has_cycle(node: str) -> bool:
                if node in temp_visited:
                    return True
                if node in visited:
                    return False

                temp_visited.add(node)
                for dep in dependency_graph.get(node, []):
                    if has_cycle(dep):
                        return True
                temp_visited.remove(node)
                visited.add(node)
                return False

            for node in dependency_graph:
                if has_cycle(node):
                    logger.error(f"Circular dependency detected starting from {node}")
                    return False

            logger.info("Dependencies validated successfully")
            return True

        except Exception as e:
            logger.error(f"Error validating dependencies: {str(e)}")
            return False
