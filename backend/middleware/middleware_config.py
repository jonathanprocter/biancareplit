"""Middleware configuration management system."""

from typing import Dict, Any, List, Optional, TypedDict
import logging
from ..config.unified_config import config_manager

logger = logging.getLogger(__name__)

class MiddlewareConfigError(Exception):
    """Custom exception for middleware configuration errors."""
    pass

class MetricsConfig(TypedDict, total=False):
    """Type definition for metrics middleware configuration."""
    enabled: bool
    namespace: str
    buckets: List[float]
    exclude_paths: List[str]

class LoggingConfig(TypedDict, total=False):
    """Type definition for logging middleware configuration."""
    enabled: bool
    level: str
    format: str

class ErrorHandlingConfig(TypedDict, total=False):
    """Type definition for error handling middleware configuration."""
    enabled: bool
    log_errors: bool
    include_traceback: bool

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
                "namespace": "medical_edu",
                "buckets": [0.1, 0.5, 1.0, 2.0, 5.0],
                "exclude_paths": ["/metrics", "/health", "/static"]
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
            },
            "health": {
                "enabled": True,
                "endpoint": "/health",
                "detailed": True,
                "cache_interval": 60
            },
            "security": {
                "enabled": True,
                "rate_limit": "60/minute",
                "cors_enabled": True,
                "jwt_required": True,
                "allowed_origins": ["*"]
            }
        }

    def _validate_config(self) -> None:
        """Validate middleware configuration structure."""
        required_middleware = ["metrics", "logging", "error_handling", "health", "security"]

        try:
            for middleware in required_middleware:
                if middleware not in self.config:
                    logger.warning(f"Required middleware '{middleware}' not configured, using defaults")
                    self.config[middleware] = self._get_default_config()[middleware]

                if not isinstance(self.config[middleware], dict):
                    raise MiddlewareConfigError(f"Invalid configuration for middleware '{middleware}'")

                if "enabled" not in self.config[middleware]:
                    self.config[middleware]["enabled"] = True

            # Validate specific middleware configurations
            self._validate_metrics_config()
            self._validate_logging_config()
            self._validate_error_handling_config()

        except Exception as e:
            logger.error(f"Configuration validation failed: {str(e)}")
            raise MiddlewareConfigError(f"Failed to validate middleware configuration: {str(e)}")

    def _validate_metrics_config(self) -> None:
        """Validate metrics middleware configuration."""
        metrics_config = self.config.get("metrics", {})
        if not isinstance(metrics_config.get("buckets", []), list):
            logger.warning("Invalid metrics buckets configuration, using defaults")
            metrics_config["buckets"] = self._get_default_config()["metrics"]["buckets"]

        if not isinstance(metrics_config.get("exclude_paths", []), list):
            logger.warning("Invalid metrics exclude_paths configuration, using defaults")
            metrics_config["exclude_paths"] = self._get_default_config()["metrics"]["exclude_paths"]

    def _validate_logging_config(self) -> None:
        """Validate logging middleware configuration."""
        logging_config = self.config.get("logging", {})
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if logging_config.get("level") not in valid_levels:
            logger.warning("Invalid logging level configuration, using INFO")
            logging_config["level"] = "INFO"

    def _validate_error_handling_config(self) -> None:
        """Validate error handling middleware configuration."""
        error_config = self.config.get("error_handling", {})
        if not isinstance(error_config.get("include_traceback"), bool):
            logger.warning("Invalid error handling traceback configuration, using False")
            error_config["include_traceback"] = False

    def get_middleware_settings(self, middleware_name: str) -> Dict[str, Any]:
        """Get configuration for specific middleware."""
        config = self.config.get(middleware_name, {})
        if not config:
            logger.warning(f"No configuration found for middleware: {middleware_name}")
            return {"enabled": False}
        return config

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