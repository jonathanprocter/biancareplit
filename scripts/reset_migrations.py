#!/usr/bin/env python3
"""Reset database and migrations."""
import os
import shutil
import sys
from pathlib import Path
import logging
from datetime import datetime
import importlib

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class MigrationResetter:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.absolute()
        self.migrations_dir = self.project_root / "migrations"
        self.backup_dir = self.project_root / "backups" / "migrations"

    def create_backup(self) -> Path:
        """Create backup of current migrations."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = self.backup_dir / f"migration_backup_{timestamp}"

        if self.migrations_dir.exists():
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            shutil.copytree(self.migrations_dir, backup_path, dirs_exist_ok=True)
            logger.info(f"Created backup at: {backup_path}")

        return backup_path

    def clean_migrations(self) -> bool:
        """Remove existing migrations directory."""
        try:
            if self.migrations_dir.exists():
                shutil.rmtree(self.migrations_dir)
                logger.info("Removed existing migrations directory")
            return True
        except Exception as e:
            logger.error(f"Failed to clean migrations: {str(e)}")
            return False

    def initialize_migrations(self) -> bool:
        """Initialize fresh migrations."""
        try:
            # Import configuration and database modules
            sys.path.insert(0, str(self.project_root))

            from backend.config.unified_config import config_manager
            from backend.database.db_config import db
            from flask import Flask

            # Create minimal Flask application
            app = Flask(__name__)

            # Initialize configuration
            config_manager.init_flask(app)

            # Initialize database
            db.init_app(app)

            with app.app_context():
                # Verify database connection
                db.db.create_all()
                logger.info("Database tables created successfully")

            return True

        except Exception as e:
            logger.error(f"Failed to initialize migrations: {str(e)}")
            return False

    def reset(self) -> bool:
        """Perform complete migration reset."""
        try:
            # Create backup first
            self.create_backup()

            # Clean existing migrations
            if not self.clean_migrations():
                return False

            # Initialize fresh migrations
            if not self.initialize_migrations():
                return False

            logger.info("Migrations reset completed successfully")
            return True

        except Exception as e:
            logger.error(f"Migration reset failed: {str(e)}")
            return False


if __name__ == "__main__":
    resetter = MigrationResetter()
    if resetter.reset():
        logger.info("Migration reset completed successfully")
        sys.exit(0)
    else:
        logger.error("Migration reset failed")
        sys.exit(1)
