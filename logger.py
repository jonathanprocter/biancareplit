import logging.config
from config import get_config


def setup_logging():
    """Setup logging configuration"""
    config = get_config()
    logging.config.dictConfig(config.get_logging_config())
    logger = logging.getLogger(__name__)
    logger.info(f"Logging setup completed for {config.ENVIRONMENT} environment")
    return logger
