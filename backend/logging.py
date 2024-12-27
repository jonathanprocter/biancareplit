"""Configure application logging."""

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logging(app):
    """Configure application logging"""
    # Ensure logs directory exists
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)

    # Get logging configuration from app config
    log_config = app.config.get("logging", {})
    log_level = getattr(logging, log_config.get("level", "INFO"))
    log_format = log_config.get(
        "format", "%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]"
    )

    # Configure root logger
    logging.basicConfig(level=log_level, format=log_format)

    # Configure file handler
    file_handler = RotatingFileHandler(
        logs_dir / "app.log", maxBytes=1024 * 1024, backupCount=10  # 1MB
    )
    file_handler.setFormatter(logging.Formatter(log_format))
    file_handler.setLevel(log_level)

    # Configure app logger
    app.logger.addHandler(file_handler)
    app.logger.setLevel(log_level)
    app.logger.info("Application logging configured")

    return app.logger
