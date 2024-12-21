import os
from pathlib import Path
import logging
import yaml

logger = logging.getLogger(__name__)


class MiddlewareConfig:
    def __init__(self):
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

    def get(self, key, default=None):
        return self.config.get(key, default)

    def load_config(self, config_path=None):
        if not config_path:
            config_path = Path("config/middleware.yaml")
        try:
            if config_path.exists():
                with open(config_path) as f:
                    self.config.update(yaml.safe_load(f))
                logger.info("Middleware configuration loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load middleware config: {e}")
            raise


middleware_config = MiddlewareConfig()
