"""Database migrations management."""

import logging
import subprocess
from pathlib import Path
from typing import List, Optional, Tuple


class MigrationManager:
    def __init__(self):
        self.logger = logging.getLogger("MigrationManager")
        self.migrations_dir = Path("migrations")
        self._setup_logging()

    def _setup_logging(self) -> None:
        """Setup logging configuration"""
        self.logger.setLevel(logging.INFO)
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.info("Migration manager logging initialized")

    def _run_command(self, command: List[str]) -> Tuple[bool, str]:
        """Run a shell command and return result"""
        try:
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            return True, result.stdout
        except subprocess.CalledProcessError as e:
            return False, e.stderr

    def init_migrations(self) -> bool:
        """Initialize fresh migration repository"""
        try:
            # Remove existing migrations
            if self.migrations_dir.exists():
                for file in self.migrations_dir.glob("*"):
                    if file.is_file():
                        file.unlink()
                self.migrations_dir.rmdir()

            # Initialize new migrations
            success, output = self._run_command(["flask", "db", "init"])
            if not success:
                self.logger.error(f"Migration initialization failed: {output}")
                return False

            self.logger.info("Migration repository initialized successfully")
            return True
        except Exception as e:
            self.logger.error(f"Error initializing migrations: {str(e)}")
            return False

    def create_migration(self, message: str) -> bool:
        """Create a new migration"""
        try:
            success, output = self._run_command(
                ["flask", "db", "migrate", "-m", message]
            )
            if not success:
                self.logger.error(f"Migration creation failed: {output}")
                return False

            self.logger.info("Migration created successfully")
            return True
        except Exception as e:
            self.logger.error(f"Error creating migration: {str(e)}")
            return False

    def upgrade_database(self, revision: str = "head") -> bool:
        """Upgrade database to specified revision"""
        try:
            success, output = self._run_command(["flask", "db", "upgrade", revision])
            if not success:
                self.logger.error(f"Database upgrade failed: {output}")
                return False

            self.logger.info("Database upgraded successfully")
            return True
        except Exception as e:
            self.logger.error(f"Error upgrading database: {str(e)}")
            return False

    def get_current_revision(self) -> Optional[str]:
        """Get current migration revision"""
        try:
            success, output = self._run_command(["flask", "db", "current"])
            if not success:
                self.logger.error(f"Failed to get current revision: {output}")
                return None
            return output.strip()
        except Exception as e:
            self.logger.error(f"Error getting current revision: {str(e)}")
            return None

    def verify_migrations(self) -> bool:
        """Verify migration history and database state"""
        try:
            success, output = self._run_command(["flask", "db", "check"])
            if not success:
                self.logger.error(f"Migration verification failed: {output}")
                return False
            return True
        except Exception as e:
            self.logger.error(f"Error verifying migrations: {str(e)}")
            return False


migrations_manager = MigrationManager()
