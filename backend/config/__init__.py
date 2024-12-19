
import os
from pathlib import Path
from typing import Dict, Any
import logging
import yaml

logger = logging.getLogger(__name__)

class Config:
    """Base configuration class"""
    def __init__(self):
        self.config_dir = Path('config')
        self.env = os.getenv('FLASK_ENV', 'development')
        self._config: Dict[str, Any] = {}
        self.load_config()

    def load_config(self) -> None:
        """Load configuration from YAML files"""
        try:
            # Load base config
            base_config = self.config_dir / f'app_{self.env}.yaml'
            if base_config.exists():
                with open(base_config) as f:
                    self._config.update(yaml.safe_load(f))

            # Load database config
            db_config = self.config_dir / f'database_{self.env}.yaml'
            if db_config.exists():
                with open(db_config) as f:
                    self._config.update(yaml.safe_load(f))

            logger.info(f"Loaded configuration for environment: {self.env}")
        except Exception as e:
            logger.error(f"Failed to load configuration: {str(e)}")
            raise

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value"""
        return self._config.get(key, default)

    def __getitem__(self, key: str) -> Any:
        """Get configuration value using dict syntax"""
        return self._config[key]

config = Config()
