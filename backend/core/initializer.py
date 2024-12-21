"""Core application initializer."""

import logging
from flask import Flask
from backend.core.context import app_context
from backend.database.db_config import init_db
from backend.middleware.base import init_middleware

logger = logging.getLogger(__name__)


def init_core(app: Flask, env: str = "development") -> bool:
    """Initialize core application components."""
    try:
        # Initialize application context
        if not app_context.initialize(env):
            logger.error("Failed to initialize application context")
            return False

        # Initialize database
        if not init_db(app, app_context.db_config):
            logger.error("Failed to initialize database")
            return False

        # Initialize middleware
        if not init_middleware(app):
            logger.error("Failed to initialize middleware")
            return False

        logger.info("Core initialization completed successfully")
        return True
    except Exception as e:
        logger.error(f"Core initialization failed: {e}")
        return False
