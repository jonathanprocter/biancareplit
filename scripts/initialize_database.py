#!/usr/bin/env python3
import sys
import logging
from flask import Flask
from backend.database.db_config import db_config
from backend.database.db_verifier import db_verifier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def initialize_database():
    """Initialize database with configuration."""
    try:
        app = Flask(__name__)

        # Initialize database
        db_config.init_app(app)

        # Verify database
        health_check = db_verifier.run_health_check()

        if all(health_check.values()):
            logger.info("Database initialization successful")
            return True
        logger.error("Database verification failed")
        return False

    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        return False


if __name__ == "__main__":
    if initialize_database():
        sys.exit(0)
    else:
        sys.exit(1)
