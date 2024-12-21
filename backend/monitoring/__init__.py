import logging
from flask import Flask
from .metrics import setup_metrics

logger = logging.getLogger(__name__)


def init_monitoring(app: Flask):
    """Initialize monitoring systems"""
    try:
        setup_metrics(app)
        logger.info("Monitoring system initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize monitoring: {str(e)}")
        raise
