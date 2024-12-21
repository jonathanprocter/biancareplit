"""Core package initialization."""

from pathlib import Path
import logging

# Create required directories
core_dir = Path(__file__).parent
config_dir = core_dir.parent.parent / "config"
config_dir.mkdir(exist_ok=True)

# Configure logging
logger = logging.getLogger(__name__)

from .config import config_manager
from .middleware import middleware_manager

__all__ = ["config_manager", "middleware_manager"]
