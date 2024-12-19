import shutil
import os
from pathlib import Path
import logging
from prometheus_client import REGISTRY, CollectorRegistry
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def clean_migrations():
    """Remove and recreate migrations directory"""
    try:
        migrations_dir = Path('migrations')
        if migrations_dir.exists():
            shutil.rmtree(migrations_dir)
            logger.info('Removed existing migrations directory')
        
        # Create fresh migrations directory
        migrations_dir.mkdir(exist_ok=True)
        logger.info('Created fresh migrations directory')
    except Exception as e:
        logger.error(f'Error cleaning migrations: {e}')
        raise

def clean_metrics_registry():
    """Clean up Prometheus metrics registry"""
    try:
        if hasattr(REGISTRY, '_collector_to_names'):
            collectors = list(REGISTRY._collector_to_names.keys())
            for collector in collectors:
                try:
                    REGISTRY.unregister(collector)
                    logger.info(f'Unregistered collector: {collector}')
                except KeyError:
                    pass
        logger.info('Cleaned metrics registry')
    except Exception as e:
        logger.error(f'Error cleaning metrics registry: {e}')
        raise

def main():
    """Execute all cleanup operations"""
    try:
        logger.info('Starting system cleanup...')
        clean_migrations()
        clean_metrics_registry()
        logger.info('System cleanup completed successfully')
    except Exception as e:
        logger.error(f'System cleanup failed: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main()
