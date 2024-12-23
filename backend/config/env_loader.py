import os
from typing import Dict, Any, Union


class EnvLoader:
    """Environment variable loader with prefix support"""

    @staticmethod
    def _convert_value(value: str) -> Union[str, int, float, bool]:
        """Convert string value to appropriate type"""
        # Boolean conversion
        if value.lower() in ("true", "false"):
            return value.lower() == "true"

        # Integer conversion
        try:
            value = int(value)
            return value
        except ValueError:
            pass

        # Float conversion
        try:
            value = float(value)
            return value
        except ValueError:
            pass

        # Default to string
        return value

    @staticmethod
    def load_env_vars(prefix: str = "") -> Dict[str, Any]:
        """Load environment variables with optional prefix"""
        env_vars = {}

        for key, value in os.environ.items():
            if prefix and not key.startswith(prefix):
                continue

            # Remove prefix if it exists
            clean_key = key[len(prefix) :] if prefix else key

            # Convert value to appropriate type
            env_vars[clean_key] = EnvLoader._convert_value(value)

        return env_vars

    @staticmethod
    def get_env_var(key: str, default: Any = None) -> Any:
        """Get single environment variable with type conversion"""
        value = os.getenv(key)
        if value is None:
            return default
        return EnvLoader._convert_value(value)


# Create singleton instance
env_loader = EnvLoader()
