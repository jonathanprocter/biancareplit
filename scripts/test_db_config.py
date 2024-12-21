import os
import sys
import logging
from backend.config.unified_config import config_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_database_config():
    """Test database configuration loading"""
    try:
        config_manager.load_config()
        db_config = config_manager.get_config("database")

        if not db_config:
            logger.error("Database configuration not found")
            return False

        required_fields = ["driver", "host", "port", "name", "user"]
        missing_fields = [field for field in required_fields if field not in db_config]

        if missing_fields:
            logger.error(f"Missing required database fields: {missing_fields}")
            return False

        logger.info("Database configuration test passed")
        return True

    except Exception as e:
        logger.error(f"Database configuration test failed: {str(e)}")
        return False


if __name__ == "__main__":
    if test_database_config():
        sys.exit(0)
    sys.exit(1)
