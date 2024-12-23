from typing import Dict, Any
import yaml
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class MiddlewareConfig:
    def __init__(self, config_path: str = "config/middleware.yaml"):
        self.config_path = Path(config_path)
        self.config: Dict[str, Any] = self._get_default_config()
        self.load_config()

    def load_config(self) -> None:
        """Load middleware configuration from YAML file"""
        try:
            if self.config_path.is_file():
                with self.config_path.open() as f:
                    self.config.update(yaml.safe_load(f) or {})
            else:
                logger.warning(
                    f"Middleware config file not found at {self.config_path}"
                )
        except Exception as e:
            logger.error(f"Error loading middleware config: {str(e)}")

    @staticmethod
    def _get_default_config() -> Dict[str, Any]:
        """Get default middleware configuration"""
        return {
            "middleware": {
                "validation": {
                    "enabled": True,
                    "order": 1,
                    "settings": {"strict_mode": True},
                },
                "error_handling": {
                    "enabled": True,
                    "order": 2,
                    "settings": {"log_errors": True},
                },
            }
        }

    def get_middleware_config(self, middleware_name: str) -> Dict[str, Any]:
        """Get configuration for specific middleware"""
        return self.config.get("middleware", {}).get(middleware_name, {})

    def is_middleware_enabled(self, middleware_name: str) -> bool:
        """Check if middleware is enabled"""
        config = self.get_middleware_config(middleware_name)
        return config.get("enabled", False)
