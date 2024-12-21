import logging
import logging.config
import yaml
from pathlib import Path
from typing import Dict, Any


def setup_logging(
    config_path: str = "config/logging.yaml", default_level: int = logging.INFO
) -> None:
    """Configure logging using yaml config file"""
    try:
        with open(config_path, "rt") as f:
            config = yaml.safe_load(f.read())
        Path("logs").mkdir(exist_ok=True)
        logging.config.dictConfig(config)
    except Exception as e:
        logging.basicConfig(level=default_level)
        logging.error(f"Error loading logging configuration: {str(e)}")
