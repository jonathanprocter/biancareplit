"""System cleanup utilities for the application."""
import logging
import shutil
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def clean_migrations():
    """Remove and recreate migrations directory"""
    try:
        migrations_dir = Path("migrations")
        if migrations_dir.exists():
            shutil.rmtree(migrations_dir)
            logger.info("Removed existing migrations directory")

        # Create fresh migrations directory
        migrations_dir.mkdir(exist_ok=True)
        logger.info("Created fresh migrations directory")
    except Exception as e:
        logger.error(f"Error cleaning migrations: {e}")
        raise


def main():
    """Execute all cleanup operations"""
    try:
        logger.info("Starting system cleanup...")
        clean_migrations()
        logger.info("System cleanup completed successfully")
    except Exception as e:
        logger.error(f"System cleanup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
