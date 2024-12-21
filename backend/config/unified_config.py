import os
from pathlib import Path
import yaml
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class ConfigManager:
    def __init__(self):
        self.config: Dict[str, Any] = {}
        self.env = os.getenv("FLASK_ENV", "development")
        self.config_dir = Path(__file__).parent
        self._load_config()

    def _load_config(self):
        """Load configuration from YAML files"""
        try:
            # Load base config
            self.config.update(self._load_yaml_file("config.yaml"))

            # Load environment specific config
            env_config = f"{self.env}.yaml"
            if (self.config_dir / env_config).exists():
                self.config.update(self._load_yaml_file(env_config))

            logger.info(f"Configuration loaded for environment: {self.env}")
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            raise

    def _load_yaml_file(self, filename: str) -> Dict[str, Any]:
        """Load a YAML file from the config directory"""
        file_path = self.config_dir / filename
        if not file_path.exists():
            logger.warning(f"Config file not found: {filename}")
            return {}

        with open(file_path) as f:
            return yaml.safe_load(f) or {}

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value using dot notation"""
        try:
            value = self.config
            for k in key.split("."):
                value = value[k]
            return value
        except (KeyError, TypeError):
            return default

    def init_app(self, app):
        """Initialize Flask application with config values"""
        for key, value in self.config.items():
            if isinstance(value, dict):
                for sub_key, sub_value in value.items():
                    app.config[f"{key.upper()}_{sub_key.upper()}"] = sub_value
            else:
                app.config[key.upper()] = value


config_manager = ConfigManager()
