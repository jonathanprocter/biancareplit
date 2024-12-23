import os
from pathlib import Path
import logging
import yaml

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)


class MiddlewareConfig:
    def __init__(self, config_path=None):
        self.config = {
            "security": {
                "enabled": True,
                "csrf_protection": True,
                "allowed_origins": ["*"],
            },
            "metrics": {"enabled": True, "endpoint": "/metrics"},
            "cache": {"enabled": True, "type": "simple"},
            "logging": {"enabled": True, "level": "INFO"},
        }
        if config_path:
            self.load_config(config_path)

    def get(self, key, default=None):
        keys = key.split(".")
        val = self.config
        for key in keys:
            if isinstance(val, dict):
                val = val.get(key)
            else:
                return default
        return val

    def load_config(self, config_path):
        config_path = Path(config_path)
        try:
            if config_path.is_file():
                with config_path.open() as f:
                    self.config.update(yaml.safe_load(f))
                logger.info("Middleware configuration loaded successfully")
            else:
                logger.error(f"Config file does not exist: {config_path}")
        except Exception as e:
            logger.error(f"Failed to load middleware config: {e}")
            raise


middleware_config = MiddlewareConfig("config/middleware.yaml")
