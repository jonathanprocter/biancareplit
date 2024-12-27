"""Database migration deployment script."""
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the project root to the Python path
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

try:
    from .migration_resolver import MigrationResolver
except ImportError:
    from backend.database.migration_resolver import MigrationResolver


def deploy_migrations():
    """Deploy and verify migrations"""
    resolver = MigrationResolver()

    try:
        with resolver.safe_migration_context():
            # First backup existing migrations
            resolver._backup_migrations()

            # Check current state
            current_revision = resolver._get_migration_state()
            db_state = resolver._get_current_db_state()

            if current_revision:
                # Try to synchronize existing migrations
                logger.info("Attempting to synchronize existing migrations...")
                if resolver.synchronize_migrations():
                    logger.info("Migrations synchronized successfully!")
                    return True
                logger.warning(
                    "Migration synchronization failed, attempting clean setup..."
                )

            # If sync fails or no migrations exist, start fresh
            logger.info("Starting fresh migration setup...")
            if resolver.clean_migrations():
                logger.info("Fresh migration setup completed successfully!")
                return True

            return False
    except Exception as e:
        logger.error(f"Migration deployment failed: {str(e)}")
        # Attempt rollback on failure
        try:
            resolver.rollback_migrations()
            logger.info("Successfully rolled back migrations")
        except Exception as rollback_error:
            logger.error(f"Rollback failed: {str(rollback_error)}")
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    if deploy_migrations():
        logger.info("Migration deployment successful!")
        sys.exit(0)
    else:
        logger.error("Migration deployment failed!")
        sys.exit(1)
