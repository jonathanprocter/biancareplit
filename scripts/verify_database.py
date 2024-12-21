#!/usr/bin/env python3
"""Verify database configuration and connectivity."""
import logging
import os
import sys
from pathlib import Path

from flask import Flask
from backend.config.app_context import context_manager
from backend.config.system_verifier import SystemVerification
from backend.config.unified_config import config_manager
from backend.database.db_config import db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - "
           "%(name)s - "
           "%(levelname)s - "
           "%(message)s"
)
logger = logging.getLogger(__name__)

# Add project root to Python path
project_root = str(Path(__file__).parent.parent.absolute())
sys.path.insert(0, project_root)


def create_app():
    """Create and configure the application."""
    app = Flask(__name__)

    try:
        # Set required configurations
        app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
        app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

        # Initialize managers in correct order
        config_manager.init_flask(app)
        context_manager.init_app(app)
        db.init_app(app)

        # Push an application context
        ctx = app.app_context()
        ctx.push()

        return app, ctx
    except Exception as e:
        logger.error(f"Failed to create application: {str(e)}")
        raise


def verify_system():
    """Run comprehensive system verification."""
    app = None
    ctx = None
    try:
        app, ctx = create_app()
        verifier = SystemVerification(context_manager)
        results = verifier.verify_system()

        print("\nSystem Verification Results:")
        for check, status in results.items():
            print(f"{check}: {'✅' if status else '❌'}")

        if all(results.values()):
            logger.info("All system checks passed successfully!")
            return True
        else:
            logger.warning(
                "Some system checks failed. "
                "Check logs for details."
            )
            return False

    except Exception as e:
        logger.error(f"System verification failed: {str(e)}")
        return False
    finally:
        if ctx:
            ctx.pop()  # Clean up the context


if __name__ == "__main__":
    if verify_system():
        sys.exit(0)
    else:
        sys.exit(1)
