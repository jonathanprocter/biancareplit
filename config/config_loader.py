
import os
from pathlib import Path
import yaml
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def load_config() -> Dict[str, Any]:
    """Load configuration from YAML files"""
    config_dir = Path('config')
    env = os.getenv('FLASK_ENV', 'development')
    config = {}

    try:
        # Load environment specific config
        env_config = config_dir / f"{env}.yaml"
        if env_config.exists():
            with open(env_config) as f:
                config.update(yaml.safe_load(f) or {})

        # Load middleware config
        middleware_config = config_dir / 'middleware.yaml'
        if middleware_config.exists():
            with open(middleware_config) as f:
                config['middleware'] = yaml.safe_load(f) or {}

        return config
    except Exception as e:
        logger.error(f"Failed to load configuration: {str(e)}")
        return {}

config_loader = load_config()
