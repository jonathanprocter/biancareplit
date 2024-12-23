"""Core configuration management for the NCLEX coaching platform."""

import json
import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from backend.config.validators import ConfigValidator
from backend.config.config_loader import ConfigLoader
from backend.config.env_loader import EnvLoader

logger = logging.getLogger(__name__)


class ConfigManager:
    """Configuration management system"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "initialized"):
            self.env = os.getenv("FLASK_ENV", "development")
            self.config: Dict[str, Any] = {}
            self.validator = ConfigValidator()
            self.config_loader = ConfigLoader()
            self.env_loader = EnvLoader()

            # Set up directory structure
            self.base_dir = Path(__file__).parent.parent.parent
            self.config_dir = self.base_dir / "config"
            self.instance_dir = self.base_dir / "instance"
            self.logs_dir = self.base_dir / "logs"

            # Create necessary directories
            for directory in [self.instance_dir, self.logs_dir, self.config_dir]:
                directory.mkdir(exist_ok=True)

            self.load_config()
            self.initialized = True

    def load_config(self) -> None:
        """Load configuration from config.json and environment variables"""
        try:
            # Load base configuration
            config_path = self.config_dir / "config.json"
            with open(config_path) as f:
                all_config = json.load(f)
                config = all_config.get(self.env, {})

            # Load environment-specific overrides
            env_config = self.env_loader.load_env_vars("APP_")

            # Merge configurations (env variables take precedence)
            self.config = self._merge_configs(config, env_config)

            # Validate final configuration
            if self.validator.validate_config(self.config):
                logger.info("Configuration loaded and validated successfully")

        except Exception as e:
            logger.error(f"Failed to load or validate config: {str(e)}")
            raise

    @staticmethod
    def _merge_configs(
        base: Dict[str, Any], override: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Deep merge configuration dictionaries"""
        merged = base.copy()

        def deep_merge(
            source: Dict[str, Any], update: Dict[str, Any]
        ) -> Dict[str, Any]:
            for key, value in update.items():
                if (
                    key in source
                    and isinstance(source[key], dict)
                    and isinstance(value, dict)
                ):
                    source[key] = deep_merge(source[key], value)
                else:
                    source[key] = value
            return source

        return deep_merge(merged, override)

    def get(self, component: str, key: Optional[str] = None) -> Any:
        """Get configuration value for a component"""
        if component not in self.config:
            raise KeyError(f"Component {component} not found in config")

        if key is None:
            return self.config[component]

        if key not in self.config[component]:
            # Try environment variable as fallback
            env_key = f"APP_{component.upper()}_{key.upper()}"
            env_value = os.getenv(env_key)
            if env_value is not None:
                return self.env_loader._convert_value(env_value)
            raise KeyError(f"Key {key} not found in {component} config")

        return self.config[component][key]

    def get_thresholds(self, component: str) -> Dict[str, Any]:
        """Get thresholds for a component"""
        return self.get(component, "thresholds")

    def init_app(self, app) -> None:
        """Initialize Flask application with configuration"""
        try:
            # Configure Flask application
            app.config["ENV"] = self.env
            app.config["DEBUG"] = self.env == "development"
            app.config["TESTING"] = self.env == "testing"
            app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", os.urandom(24).hex())

            # Add custom configuration
            app.config["HEALTH_CHECK_PORT"] = self.get("healthCheck", "port")
            app.config["HEALTH_CHECK_INTERVAL"] = self.get("healthCheck", "interval")

            # Set up logging
            self._setup_logging(app)

            logger.info(f"Application configured for environment: {self.env}")

        except Exception as e:
            logger.error(f"Failed to initialize application configuration: {str(e)}")
            raise

    def _setup_logging(self, app) -> None:
        """Configure application logging"""
        log_level = "DEBUG" if self.env == "development" else "INFO"
        log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

        # Create logs directory if it doesn't exist
        self.logs_dir.mkdir(exist_ok=True)

        # Configure root logger
        logging.basicConfig(
            level=getattr(logging, log_level),
            format=log_format,
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler(str(self.logs_dir / f"{self.env}.log")),
            ],
        )

        # Configure Flask logger
        if not app.debug and not app.logger.handlers:
            file_handler = logging.FileHandler(str(self.logs_dir / "flask.log"))
            file_handler.setFormatter(logging.Formatter(log_format))
            app.logger.addHandler(file_handler)
            app.logger.setLevel(getattr(logging, log_level))


# Create singleton instance
config_manager = ConfigManager()
