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
            "logging": {
                "enabled": True,
                "level": "INFO",
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            },
            "error_handling": {
                "enabled": True,
                "log_errors": True,
                "include_traceback": False
            },
            "security": {
                "enabled": True,
                "rate_limiting": {
                    "enabled": True,
                    "default_limits": ["200 per day", "50 per hour"]
                }
            },
            "performance_tracking": {
                "enabled": True,
                "warning_threshold_ms": 1000,
                "critical_threshold_ms": 3000
            },
            "database": {
                "enabled": True,
                "connection_timeout": 30,
                "pool_size": 5
            }
        }

    def _validate_config(self) -> None:
        """Validate middleware configuration structure."""
        required_middleware = ["logging", "error_handling", "security"]

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

    def validate_middleware_settings(self, middleware_name: str, required_settings: List[str]) -> bool:
        """Validate specific middleware settings."""
        try:
            config = self.get_middleware_config(middleware_name)
            return all(setting in config for setting in required_settings)
        except Exception as e:
            logger.error(f"Error validating middleware settings: {str(e)}")
            return False

    def __str__(self) -> str:
        """String representation of middleware configuration."""
        enabled = self.get_enabled_middleware()
        return f"MiddlewareConfig(enabled={enabled})"

# Create singleton instance
middleware_registry = MiddlewareConfig()