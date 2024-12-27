"""Configuration management for the NCLEX coaching platform."""

from backend.config.unified_config import config_manager, ConfigurationError

__all__ = ["config_manager", "ConfigurationError"]
