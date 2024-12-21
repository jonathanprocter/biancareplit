"""Database migrations manager."""

import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional
from flask import Flask
from .db_config import db, migrate

logger = logging.getLogger(__name__)


class MigrationManager:
    """Manage database migrations."""

    def __init__(self, app: Optional[Flask] = None):
        self.app = app
        if app:
            self.init_app(app)

    def init_app(self, app: Flask) -> None:
        """Initialize with Flask app."""
        self.app = app
        self._ensure_migrations_dir()

    def _ensure_migrations_dir(self) -> None:
        """Ensure migrations directory exists."""
        migrations_dir = Path("migrations")
        if not migrations_dir.exists():
            migrations_dir.mkdir()
            versions_dir = migrations_dir / "versions"
            versions_dir.mkdir()
            logger.info("Created migrations directory structure")

    def create_backup(self) -> Optional[Path]:
        """Create backup of current migrations."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_dir = Path(f"backups/migrations/migration_backup_{timestamp}")
            backup_dir.parent.mkdir(parents=True, exist_ok=True)

            if Path("migrations").exists():
                import shutil

                shutil.copytree("migrations", backup_dir)
                logger.info(f"Created migrations backup at {backup_dir}")
                return backup_dir
            return None
        except Exception as e:
            logger.error(f"Failed to create migrations backup: {e}")
            return None

    def initialize_migrations(self) -> bool:
        """Initialize fresh migrations setup."""
        try:
            self._ensure_migrations_dir()
            with self.app.app_context():
                db.create_all()
            logger.info("Initialized fresh migrations")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize migrations: {e}")
            return False
