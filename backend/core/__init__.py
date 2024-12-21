"""Core package initialization."""

import logging
from pathlib import Path
from .config import config_manager
from .middleware import middleware_manager

# Configure logging
logger = logging.getLogger(__name__)

# Create required directories
core_dir = Path(__file__).parent
config_dir = core_dir.parent.parent / "config"
config_dir.mkdir(exist_ok=True)

__all__ = ["config_manager", "middleware_manager"]
