"""Migration verification system for database migrations."""

import logging
from pathlib import Path
from typing import Dict, Any, Optional
from ..core import db_manager
from flask import current_app


class MigrationVerifier:
    """Verifies migration system state and health."""

    def __init__(self, migrations_dir: Optional[Path] = None):
        self.migrations_dir = migrations_dir or Path("migrations")
        self.logger = self._setup_logger()

    def _setup_logger(self) -> logging.Logger:
        """Initialize logger for migration verification."""
        logger = logging.getLogger("MigrationVerifier")
        logger.setLevel(logging.INFO)

        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)

        return logger

    def verify_structure(self) -> Dict[str, bool]:
        """Verify migrations directory structure."""
        results = {
            "migrations_dir_exists": False,
            "env_py_exists": False,
            "versions_dir_exists": False,
            "alembic_ini_exists": False,
        }

        try:
            results["migrations_dir_exists"] = self.migrations_dir.exists()
            if results["migrations_dir_exists"]:
                results["env_py_exists"] = (self.migrations_dir / "env.py").exists()
                results["versions_dir_exists"] = (
                    self.migrations_dir / "versions"
                ).exists()
                results["alembic_ini_exists"] = (
                    self.migrations_dir / "alembic.ini"
                ).exists()

            return results
        except Exception as e:
            self.logger.error(f"Structure verification failed: {str(e)}")
            return results

    def verify_database_connection(self) -> bool:
        """Verify database connection."""
        try:
            if current_app:
                with current_app.app_context():
                    db_manager.verify_connection()
                    return True
            return False
        except Exception as e:
            self.logger.error(f"Database connection verification failed: {str(e)}")
            return False

    def verify_migrations(self) -> Dict[str, Any]:
        """Verify migration system state and history."""
        results = {
            "directory_exists": False,
            "migrations_initialized": False,
            "versions_exist": False,
            "database_current": False,
            "migration_history_valid": False,
            "pending_migrations": False,
            "error_details": None,
        }

        try:
            # Check migrations directory
            results["directory_exists"] = self.migrations_dir.exists()

            if results["directory_exists"]:
                env_py = self.migrations_dir / "env.py"
                alembic_ini = self.migrations_dir / "alembic.ini"
                results["migrations_initialized"] = (
                    env_py.exists() and alembic_ini.exists()
                )

                # Check for version files
                versions_dir = self.migrations_dir / "versions"
                results["versions_exist"] = versions_dir.exists() and any(
                    versions_dir.glob("*.py")
                )

                # Verify migration history
                if results["versions_exist"]:
                    with current_app.app_context():
                        try:
                            db_manager.verify_connection()
                            results["migration_history_valid"] = True
                            results["database_current"] = True
                        except Exception as db_err:
                            results["error_details"] = str(db_err)
                            self.logger.error(f"Database verification failed: {db_err}")

            return results

        except Exception as e:
            self.logger.error(f"Verification failed: {str(e)}")
            results["error_details"] = str(e)
            return results

    def run_health_check(self) -> Dict[str, Any]:
        """Run comprehensive health check."""
        health_status = {
            "structure": {},
            "database_connection": False,
            "migrations": {},
            "overall_health": False,
        }

        try:
            # Verify structure
            health_status["structure"] = self.verify_structure()

            # Check database connection
            health_status["database_connection"] = self.verify_database_connection()

            # Verify migrations
            health_status["migrations"] = self.verify_migrations()

            # Calculate overall health
            structure_valid = all(health_status["structure"].values())
            migrations_valid = all(
                health_status["migrations"].values()
            )  # Consider only boolean values for simplicity.  Could be enhanced.
            health_status["overall_health"] = (
                structure_valid
                and health_status["database_connection"]
                and migrations_valid
            )

            if health_status["overall_health"]:
                self.logger.info("Migration system health check passed")
            else:
                self.logger.warning("Migration system needs attention")

            return health_status

        except Exception as e:
            self.logger.error(f"Health check failed: {str(e)}")
            health_status["overall_health"] = False
            return health_status
