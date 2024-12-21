#!/usr/bin/env python3
"""Test configuration system functionality."""
import logging
import sys
from pathlib import Path

from flask import Flask
from backend.config.config_manager import config_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Add project root to Python path
project_root = str(Path(__file__).parent.parent.absolute())
sys.path.insert(0, project_root)


def test_configuration():
    """Test configuration initialization and verification."""
    try:
        # Initialize configuration
        init_status = config_manager.initialize_config()
        if not init_status:
            logger.error("Configuration initialization failed")
            return {"initialization": False}

        # Verify system state
        status = config_manager.verify_system()

        logger.info("\nSystem Configuration Status:")
        for check, state in status.items():
            logger.info(f"{check}: {'✓' if state else '✗'}")

        # Test Flask integration
        app = Flask(__name__)
        config_manager.init_app(app)

        logger.info("\nFlask Configuration:")
        logger.info(f"Debug Mode: {app.config['DEBUG']}")
        logger.info(f"Database URL: {app.config['SQLALCHEMY_DATABASE_URI']}")

        status["flask_integration"] = True
        return status

    except Exception as e:
        logger.error(f"Configuration test failed: {str(e)}")
        return {"error": False}


if __name__ == "__main__":
    results = test_configuration()
    if results and all(results.values()):
        logger.info("Configuration system working correctly")
        sys.exit(0)
    else:
        logger.error("Configuration system needs attention")
        sys.exit(1)
