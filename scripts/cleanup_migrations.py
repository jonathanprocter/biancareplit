"""Clean up migrations directory and database files"""

import logging
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Add the project root to Python path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# Application imports
from backend.database.migration_resolver import MigrationResolver


def cleanup_migrations():
    """Clean up migrations directory and database files"""
    try:
        # Initialize the migration resolver
        resolver = MigrationResolver()

        # Use the safe migration context to handle the cleanup
        with resolver.safe_migration_context():
            # First try to synchronize existing migrations
            logger.info("Attempting to synchronize existing migrations...")
            if resolver.synchronize_migrations():
                logger.info("Successfully synchronized migrations")
                return True

            # If synchronization fails, start fresh
            logger.info("Starting fresh migration setup...")
            if resolver.clean_migrations():
                logger.info("Successfully completed fresh migration setup")
                return True

            return False

    except Exception as e:
        logger.error("Error during cleanup: %s", str(e))
        return False


if __name__ == "__main__":
    cleanup_migrations()
