import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

import yaml

from .validators import ConfigValidator

logger = logging.getLogger(__name__)


class ConfigLoader:
    """Configuration loader for YAML and JSON files"""

    def __init__(self, base_path: str = "config"):
        self.base_path = Path(base_path)
        self.env = os.getenv("FLASK_ENV", "development")
        self.validator = ConfigValidator()

    @staticmethod
    def load_yaml(file_path: Path) -> Optional[Dict[str, Any]]:
        """Load YAML configuration file"""
        try:
            if file_path.is_file():
                with file_path.open("r") as f:
                    config = yaml.safe_load(f)
                    if config is None:
                        logger.warning(f"Empty YAML file: {file_path}")
                        return {}
                    return config
            logger.warning(f"Configuration file not found: {file_path}")
            return None
        except Exception as e:
            logger.error(f"Failed to load YAML config {file_path}: {str(e)}")
            return None

    @staticmethod
    def load_json(file_path: Path) -> Optional[Dict[str, Any]]:
        """Load JSON configuration file"""
        try:
            if file_path.is_file():
                with file_path.open("r") as f:
                    return json.load(f)
            logger.warning(f"Configuration file not found: {file_path}")
            return None
        except Exception as e:
            logger.error(f"Failed to load JSON config {file_path}: {str(e)}")
            return None

    def load_config(self, name: str) -> Dict[str, Any]:
        """Load configuration from YAML or JSON file"""
        # Try loading YAML first
        yaml_path = self.base_path / f"{name}_{self.env}.yaml"
        config = self.load_yaml(yaml_path)

        # If YAML not found, try JSON
        if config is None:
            json_path = self.base_path / f"{name}_{self.env}.json"
            config = self.load_json(json_path)

        # If neither found, try default config
        if config is None:
            default_yaml = self.base_path / f"{name}_default.yaml"
            default_json = self.base_path / f"{name}_default.json"
            config = self.load_yaml(default_yaml) or self.load_json(default_json) or {}

        # Validate the config
        if not self.validator.validate(config):
            raise ValueError("Invalid configuration")

        return self._process_config(config)

    @staticmethod
    def _process_config(config: Dict[str, Any]) -> Dict[str, Any]:
        """Process configuration by substituting environment variables"""
        processed = {}

        def substitute_env_vars(value: Any) -> Any:
            if (
                isinstance(value, str)
                and value.startswith("${")
                and value.endswith("}")
            ):
                env_var = value[2:-1]
                return os.getenv(env_var, value)
            if isinstance(value, dict):
                return {k: substitute_env_vars(v) for k, v in value.items()}
            if isinstance(value, list):
                return [substitute_env_vars(v) for v in value]
            return value

        for key, value in config.items():
            processed[key] = substitute_env_vars(value)

        return processed


# Create singleton instance
config_loader = ConfigLoader()
