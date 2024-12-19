
from typing import Dict, List, Optional, Any
import logging
import yaml
from pathlib import Path

logger = logging.getLogger(__name__)

class MiddlewareConfig:
    def __init__(self, config_path: Optional[str] = None):
        self.config: Dict[str, Any] = {}
        self.required_fields = ['enabled', 'order', 'settings']
        if config_path:
            self.load_config(config_path)

    def load_config(self, config_path: str) -> None:
        """Load middleware configuration from YAML file"""
        try:
            config_file = Path(config_path)
            if not config_file.exists():
                raise FileNotFoundError(f"Middleware config file not found: {config_path}")
            
            with open(config_file, 'r') as f:
                self.config = yaml.safe_load(f)
            self.validate_config()
            logger.info("Middleware configuration loaded successfully")
        except Exception as e:
            logger.error(f"Error loading middleware config: {str(e)}")
            raise

    def validate_config(self) -> bool:
        """Validate middleware configuration structure"""
        if not self.config:
            raise ValueError("Empty middleware configuration")

        for middleware_name, settings in self.config.items():
            for field in self.required_fields:
                if field not in settings:
                    raise ValueError(f"Missing required field '{field}' in middleware '{middleware_name}'")
            
            if not isinstance(settings['enabled'], bool):
                raise ValueError(f"'enabled' must be boolean in middleware '{middleware_name}'")
            
            if not isinstance(settings['order'], int):
                raise ValueError(f"'order' must be integer in middleware '{middleware_name}'")

        return True

    def get_enabled_middleware(self) -> List[str]:
        """Get list of enabled middleware in order"""
        return [
            name for name, settings in sorted(
                self.config.items(),
                key=lambda x: x[1]['order']
            ) if settings['enabled']
        ]

    def get_middleware_settings(self, middleware_name: str) -> Dict[str, Any]:
        """Get settings for specific middleware"""
        return self.config.get(middleware_name, {}).get('settings', {})
from typing import Dict, Any
import yaml
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class MiddlewareConfig:
    def __init__(self, config_path: str = "config/middleware.yaml"):
        self.config_path = Path(config_path)
        self.config: Dict[str, Any] = {}
        self.load_config()

    def load_config(self) -> None:
        """Load middleware configuration from YAML file"""
        try:
            if self.config_path.exists():
                with open(self.config_path) as f:
                    self.config = yaml.safe_load(f)
            else:
                logger.warning(f"Middleware config file not found at {self.config_path}")
                self.config = self._get_default_config()
        except Exception as e:
            logger.error(f"Error loading middleware config: {str(e)}")
            self.config = self._get_default_config()

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default middleware configuration"""
        return {
            "middleware": {
                "validation": {
                    "enabled": True,
                    "order": 1,
                    "settings": {"strict_mode": True}
                },
                "error_handling": {
                    "enabled": True,
                    "order": 2,
                    "settings": {"log_errors": True}
                }
            }
        }

    def get_middleware_config(self, middleware_name: str) -> Dict[str, Any]:
        """Get configuration for specific middleware"""
        return self.config.get("middleware", {}).get(middleware_name, {})

    def is_middleware_enabled(self, middleware_name: str) -> bool:
        """Check if middleware is enabled"""
        config = self.get_middleware_config(middleware_name)
        return config.get("enabled", False)
