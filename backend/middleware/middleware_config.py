"""Middleware configuration management system."""

from typing import Dict, Any, List, Optional
import logging
from pathlib import Path
from ..config.unified_config import config_manager, ConfigurationError

logger = logging.getLogger(__name__)

class MiddlewareConfigError(Exception):
    """Custom exception for middleware configuration errors."""
    pass

class MiddlewareConfig:
    """Middleware configuration manager with validation."""

    def __init__(self):
        self.config = self._load_middleware_config()
        self._validate_config()

    def _load_middleware_config(self) -> Dict[str, Any]:
        """Load middleware configuration from unified config."""
        try:
            middleware_config = config_manager.get("MIDDLEWARE", {})
            if not middleware_config:
                logger.warning("No middleware configuration found in unified config")
                middleware_config = self._get_default_config()
            return middleware_config
        except Exception as e:
            logger.error(f"Error loading middleware config: {str(e)}")
            return self._get_default_config()

    @staticmethod
    def _get_default_config() -> Dict[str, Any]:
        """Get default middleware configuration."""
        return {
            "metrics": {
                "enabled": True,
                "endpoint": "/metrics",
                "exclude_paths": ["/metrics", "/health", "/static"],
                "buckets": [0.1, 0.5, 1.0, 2.0, 5.0],  # Latency buckets in seconds
                "namespace": "medical_edu"  # Prefix for all metrics
            },
            "logging": {
                "enabled": True,
                "level": "INFO",
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            },
            "error_handling": {
                "enabled": True,
                "log_errors": True,
                "include_traceback": False
            }
        }

    def _validate_config(self) -> None:
        """Validate middleware configuration structure."""
        required_middleware = ["metrics", "logging", "error_handling"]

        for middleware in required_middleware:
            if middleware not in self.config:
                raise MiddlewareConfigError(f"Required middleware '{middleware}' not configured")

            if not isinstance(self.config[middleware], dict):
                raise MiddlewareConfigError(f"Invalid configuration for middleware '{middleware}'")

            if "enabled" not in self.config[middleware]:
                raise MiddlewareConfigError(f"Missing 'enabled' flag for middleware '{middleware}'")

    def get_middleware_config(self, middleware_name: str) -> Dict[str, Any]:
        """Get configuration for specific middleware."""
        config = self.config.get(middleware_name, {})
        if not config:
            logger.warning(f"No configuration found for middleware: {middleware_name}")
            return {"enabled": False}
        return config

    def is_middleware_enabled(self, middleware_name: str) -> bool:
        """Check if middleware is enabled."""
        config = self.get_middleware_config(middleware_name)
        return config.get("enabled", False)

    def get_enabled_middleware(self) -> List[str]:
        """Get list of enabled middleware components."""
        return [name for name, config in self.config.items() 
                if isinstance(config, dict) and config.get("enabled", False)]

    def __str__(self) -> str:
        """String representation of middleware configuration."""
        enabled = self.get_enabled_middleware()
        return f"MiddlewareConfig(enabled={enabled})"

# Create singleton instance
middleware_registry = MiddlewareConfig()