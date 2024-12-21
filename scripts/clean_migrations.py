"""Script to clean and reinitialize migrations."""

import os
import sys
import shutil
import logging
from datetime import datetime
from pathlib import Path

from backend.config.config_manager import config_manager

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def backup_migrations():
    """Create backup of current migrations."""
    backup_dir = Path("backups/migrations")
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"migration_backup_{timestamp}"

    migrations_dir = Path("migrations")
    if migrations_dir.exists():
        try:
            shutil.copytree(migrations_dir, backup_path)
            logger.info(f"Backup created at: {backup_path}")
            return backup_path
        except Exception as e:
            logger.error(f"Failed to create backup: {str(e)}")
            return None
    return None


def clean_migrations():
    """Remove existing migrations."""
    migrations_dir = Path("migrations")
    if migrations_dir.exists():
        try:
            shutil.rmtree(migrations_dir, ignore_errors=True)
            logger.info("Removed existing migrations directory")
            return True
        except Exception as e:
            logger.error(f"Failed to remove migrations directory: {str(e)}")
            return False
    return True


def init_migrations():
    """Initialize fresh migrations."""
    try:
        from backend.app_factory import create_app
        from backend.database.core import db_manager

        app = create_app()

        with app.app_context():
            # Initialize database with our singleton manager
            db_manager.init_app(app)

            # Initialize new migrations
            os.system("flask db init")
            os.system('flask db migrate -m "Initial migration"')
            os.system("flask db upgrade")

            logger.info("Migrations initialized successfully")
            return True

    except ImportError as e:
        logger.error(f"Failed to import required modules: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Migration initialization failed: {str(e)}")
        if hasattr(e, "__cause__") and e.__cause__:
            logger.error(f"Caused by: {str(e.__cause__)}")
        return False


def main():
    """Main execution function."""
    try:
        # Create backup before proceeding
        backup_path = backup_migrations()
        if backup_path:
            logger.info(f"Created backup at: {backup_path}")

        # Clean existing migrations
        if not clean_migrations():
            raise Exception("Failed to clean existing migrations")

        # Initialize new migrations
        if not init_migrations():
            raise Exception("Failed to initialize new migrations")

        logger.info("Migrations cleaned and reinitialized successfully")
        return True

    except Exception as e:
        logger.error(f"Failed to clean and reinitialize migrations: {str(e)}")
        return False


if __name__ == "__main__":
    sys.exit(0 if main() else 1)