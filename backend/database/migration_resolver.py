import json
import logging
import os
import shutil
import subprocess
import sys
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import MetaData, create_engine, inspect


class MigrationResolver:
    """Handles database migration resolution and management."""

    def __init__(self, app_path: str = "."):
        """Initialize the migration resolver.

        Args:
            app_path: Base path for the application
        """
        self.app_path = Path(app_path)
        self.migrations_dir = self.app_path / "migrations"
        self.backup_dir = self.app_path / "migrations_backup"
        self.backup_dir.mkdir(exist_ok=True)
        self.logger = self._setup_logger()
        self.engine = self._create_engine()

    @staticmethod
    def _setup_logger() -> logging.Logger:
        """Initialize logging configuration"""
        logger = logging.getLogger("MigrationResolver")
        logger.setLevel(logging.INFO)

        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger

    @staticmethod
    def _create_engine():
        """Create SQLAlchemy engine from environment settings"""
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL environment variable not set")
        return create_engine(database_url)

    def _backup_migrations(self) -> bool:
        """Create backup of current migrations"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = self.backup_dir / f"backup_{timestamp}"

            if self.migrations_dir.exists():
                shutil.copytree(self.migrations_dir, backup_path)
                self.logger.info(f"Migrations backed up to {backup_path}")
                return True
            return False
        except Exception as e:
            self.logger.error(f"Backup failed: {str(e)}")
            return False

    def _restore_backup(self, backup_path: Path) -> bool:
        """Restore migrations from backup"""
        try:
            if self.migrations_dir.exists():
                shutil.rmtree(self.migrations_dir)
            shutil.copytree(backup_path, self.migrations_dir)
            self.logger.info("Migrations restored from backup")
            return True
        except Exception as e:
            self.logger.error(f"Restore failed: {str(e)}")
            return False

    def _get_current_db_state(self) -> Dict:
        """Get current database schema state"""
        inspector = inspect(self.engine)
        state = {"tables": {}, "indexes": {}, "foreign_keys": {}}

        for table_name in inspector.get_table_names():
            state["tables"][table_name] = {
                "columns": inspector.get_columns(table_name),
                "pk": inspector.get_pk_constraint(table_name),
                "foreign_keys": inspector.get_foreign_keys(table_name),
                "indexes": inspector.get_indexes(table_name),
            }

        return state

    def _get_migration_state(self) -> List[str]:
        """Get list of applied migrations"""
        conn = self.engine.connect()
        context = MigrationContext.configure(conn)
        return context.get_current_revision()

    def clean_migrations(self) -> bool:
        """Remove existing migrations and initialize fresh"""
        try:
            # Backup existing migrations
            if not self._backup_migrations():
                self.logger.warning("No existing migrations to backup")

            # Remove existing migrations
            if self.migrations_dir.exists():
                shutil.rmtree(self.migrations_dir)

            # Initialize new migrations
            subprocess.run(["flask", "db", "init"], check=True)

            # Create initial migration
            subprocess.run(
                ["flask", "db", "migrate", "-m", "Initial migration"], check=True
            )

            # Apply migration
            subprocess.run(["flask", "db", "upgrade"], check=True)

            self.logger.info("Migration clean-up completed successfully")
            return True
        except Exception as e:
            self.logger.error(f"Clean-up failed: {str(e)}")
            return False

    def synchronize_migrations(self) -> bool:
        """Synchronize existing migrations with database state"""
        try:
            # Get current states
            db_state = self._get_current_db_state()
            current_revision = self._get_migration_state()

            if not current_revision:
                self.logger.error("No migration revision found")
                return False

            # Verify migrations match database
            config = Config("migrations/alembic.ini")
            script = ScriptDirectory.from_config(config)

            # Check if heads match
            heads = script.get_heads()
            if current_revision not in heads:
                self.logger.error("Migration head mismatch")
                return False

            # Create new migration for any missing changes
            subprocess.run(
                ["flask", "db", "migrate", "-m", "Synchronization migration"],
                check=True,
            )

            # Apply any pending migrations
            subprocess.run(["flask", "db", "upgrade"], check=True)

            self.logger.info("Migrations synchronized successfully")
            return True
        except Exception as e:
            self.logger.error(f"Synchronization failed: {str(e)}")
            return False

    def rollback_migrations(self) -> bool:
        """Rollback to last known good state"""
        try:
            # Find latest backup
            if not self.backup_dir.exists():
                self.logger.error("No backup directory found")
                return False

            backups = sorted(self.backup_dir.glob("backup_*"))
            if not backups:
                self.logger.error("No backups found")
                return False

            latest_backup = backups[-1]

            # Restore from backup
            if not self._restore_backup(latest_backup):
                return False

            # Downgrade database
            subprocess.run(["flask", "db", "downgrade", "base"], check=True)

            # Upgrade to restored state
            subprocess.run(["flask", "db", "upgrade"], check=True)

            self.logger.info("Migration rollback completed successfully")
            return True
        except Exception as e:
            self.logger.error(f"Rollback failed: {str(e)}")
            return False

    @contextmanager
    def safe_migration_context(self):
        """Context manager for safe migration operations"""
        try:
            # Create backup before operations
            self._backup_migrations()
            yield
        except Exception as e:
            self.logger.error(f"Migration operation failed: {str(e)}")
            # Attempt rollback on failure
            self.rollback_migrations()
            raise
        finally:
            self.logger.info("Migration context closed")
