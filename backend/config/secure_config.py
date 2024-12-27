import os
from typing import Dict, Any, Optional, List, Union
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

REQUIRED_ENV_VARS = [
    "DATABASE_URL",
    "REDIS_URL",
    "SECRET_KEY",
    "JWT_SECRET_KEY",
    "PASSWORD_SALT",
]

for var in REQUIRED_ENV_VARS:
    if var not in os.environ:
        raise EnvironmentError(f"Required environment variable {var} not set")


class SecureConfigManager:
    """Manages secure configuration for the application."""

    def __init__(self):
        """Initialize the configuration manager."""
        self.config = {}
        self.initialized = False
        self.load_base_config()

    def load_base_config(self):
        """Load base configuration from environment variables."""
        for var in REQUIRED_ENV_VARS:
            self.config[var] = os.getenv(var)
        self.initialized = True

    def get_config(self, key: str) -> Optional[str]:
        """Get a configuration value."""
        if not self.initialized:
            raise RuntimeError("Configuration manager not initialized")
        return self.config.get(key)

    def set_config(self, key: str, value: Any) -> None:
        """Set a configuration value."""
        if not self.initialized:
            raise RuntimeError("Configuration manager not initialized")
        self.config[key] = value


# Create singleton instance
config_manager = SecureConfigManager()
