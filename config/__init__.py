"""Configuration management for the NCLEX coaching platform."""

from backend.config.unified_config import ConfigurationError, config_manager

__all__ = ["config_manager", "ConfigurationError"]
