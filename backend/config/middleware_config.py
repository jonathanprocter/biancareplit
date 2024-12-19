
from typing import Dict, List, Optional, Any
import logging
from pathlib import Path
import yaml

logger = logging.getLogger(__name__)

class MiddlewareConfig:
    def __init__(self):
        self.config: Dict[str, Any] = {}
        self.load_config()
    
    def load_config(self) -> None:
        try:
            config_path = Path("config/middleware.yaml")
            if config_path.exists():
                with open(config_path) as f:
                    self.config = yaml.safe_load(f)
                logger.info("Middleware configuration loaded successfully")
            else:
                logger.warning("No middleware configuration found, using defaults")
                self.config = self._get_default_config()
        except Exception as e:
            logger.error(f"Error loading middleware configuration: {str(e)}")
            self.config = self._get_default_config()

    def _get_default_config(self) -> Dict[str, Any]:
        return {
            "error_handling": {"enabled": True},
            "logging": {"enabled": True, "level": "INFO"},
            "cors": {"enabled": True},
            "database": {"enabled": True},
            "metrics": {"enabled": True}
        }

    def get_middleware_config(self, name: str) -> Optional[Dict[str, Any]]:
        return self.config.get(name)

middleware_config = MiddlewareConfig()
