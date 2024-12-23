"""Unified configuration management system for the medical education platform."""

import os
from pathlib import Path
import yaml
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class UnifiedConfigManager:
    """Centralized configuration management system."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(UnifiedConfigManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.config: Dict[str, Any] = {}
        self.env = os.getenv("FLASK_ENV", "development")
        self.config_dir = Path(__file__).resolve().parent

        # Core settings
        self.required_env_vars = [
            "SECRET_KEY",
            "DATABASE_URL"
        ]

        # Initialize configuration
        self._load_config()
        self._initialized = True

    def _load_config(self) -> None:
        """Load configuration from multiple sources."""
        try:
            # Load base config
            base_config = self._load_yaml_file("config.yaml")
            self.config.update(base_config)

            # Load environment specific config
            env_config = self._load_yaml_file(f"{self.env}.yaml")
            self.config.update(env_config)

            # Override with environment variables
            self._load_env_overrides()

            # Validate configuration
            self._validate_config()

            logger.info(f"Configuration loaded successfully for environment: {self.env}")

        except Exception as e:
            logger.error(f"Failed to load configuration: {str(e)}")
            raise

    def _load_yaml_file(self, filename: str) -> Dict[str, Any]:
        """Load and parse YAML configuration file."""
        file_path = self.config_dir / filename
        if not file_path.exists():
            logger.warning(f"Config file not found: {filename}")
            return {}

        try:
            with file_path.open() as f:
                return yaml.safe_load(f) or {}
        except Exception as e:
            logger.error(f"Error loading {filename}: {str(e)}")
            return {}

    def _load_env_overrides(self) -> None:
        """Override configuration with environment variables."""
        for key in os.environ:
            if key.startswith("APP_"):
                config_key = key[4:].lower()
                self.config[config_key] = os.getenv(key)

    def _validate_config(self) -> None:
        """Validate required configuration settings."""
        missing_vars = []
        for var in self.required_env_vars:
            if not os.getenv(var):
                missing_vars.append(var)

        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value using dot notation."""
        try:
            value = self.config
            for k in key.split("."):
                value = value[k]
            return value
        except (KeyError, TypeError):
            return default

    def init_app(self, app) -> None:
        """Initialize Flask application with configuration."""
        try:
            # Set core Flask configuration
            app.config.update({
                "ENV": self.env,
                "DEBUG": self.env == "development",
                "TESTING": self.env == "testing",
                "SECRET_KEY": os.getenv("SECRET_KEY"),
                "SQLALCHEMY_DATABASE_URI": os.getenv("DATABASE_URL"),
                "SQLALCHEMY_TRACK_MODIFICATIONS": False
            })

            # Update with custom configuration
            for key, value in self.config.items():
                if isinstance(value, dict):
                    for sub_key, sub_value in value.items():
                        app.config[f"{key.upper()}_{sub_key.upper()}"] = sub_value
                else:
                    app.config[key.upper()] = value

            logger.info("Application configuration initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize application configuration: {str(e)}")
            raise

# Create singleton instance
config_manager = UnifiedConfigManager()