# system_manager.py
import os
import sys
import shutil
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
import yaml
import json
from datetime import datetime
from contextlib import contextmanager
import subprocess


class SystemManager:
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.logger = self._setup_logger()
        self.config_dir = self.base_path / "config"
        self.migrations_dir = self.base_path / "migrations"
        self.backup_dir = self.base_path / "backups"
        self.env = os.getenv("APP_ENV", "development")

    def _setup_logger(self) -> logging.Logger:
        """Initialize logging configuration"""
        logger = logging.getLogger("SystemManager")
        logger.setLevel(logging.INFO)

        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger

    def _create_backup(self) -> str:
        """Create backup of current system state"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = self.backup_dir / f"backup_{timestamp}"

        try:
            # Create backup directory
            backup_path.mkdir(parents=True, exist_ok=True)

            # Backup configurations
            if self.config_dir.exists():
                shutil.copytree(
                    self.config_dir, backup_path / "config", dirs_exist_ok=True
                )

            # Backup migrations
            if self.migrations_dir.exists():
                shutil.copytree(
                    self.migrations_dir, backup_path / "migrations", dirs_exist_ok=True
                )

            self.logger.info(f"Backup created at {backup_path}")
            return str(backup_path)
        except Exception as e:
            self.logger.error(f"Backup creation failed: {str(e)}")
            raise

    def restore_backup(self, backup_path: str) -> bool:
        """Restore system from backup"""
        backup_dir = Path(backup_path)

        try:
            # Restore configurations
            if (backup_dir / "config").exists():
                if self.config_dir.exists():
                    shutil.rmtree(self.config_dir)
                shutil.copytree(backup_dir / "config", self.config_dir)

            # Restore migrations
            if (backup_dir / "migrations").exists():
                if self.migrations_dir.exists():
                    shutil.rmtree(self.migrations_dir)
                shutil.copytree(backup_dir / "migrations", self.migrations_dir)

            self.logger.info(f"System restored from {backup_path}")
            return True
        except Exception as e:
            self.logger.error(f"Restore failed: {str(e)}")
            return False

    def clean_system(self) -> bool:
        """Remove all existing configurations and migrations"""
        try:
            # Create backup before cleaning
            backup_path = self._create_backup()

            # Remove existing configurations
            if self.config_dir.exists():
                shutil.rmtree(self.config_dir)

            # Remove existing migrations
            if self.migrations_dir.exists():
                shutil.rmtree(self.migrations_dir)

            # Initialize fresh directories
            self.config_dir.mkdir(parents=True)

            self.logger.info("System cleaned successfully")
            return True
        except Exception as e:
            self.logger.error(f"System cleanup failed: {str(e)}")
            if backup_path:
                self.restore_backup(backup_path)
            return False

    def initialize_database_config(self) -> bool:
        """Initialize database configuration"""
        try:
            config = {
                "database": {
                    "driver": "postgresql",
                    "host": os.getenv("DB_HOST", "localhost"),
                    "port": int(os.getenv("DB_PORT", "5432")),
                    "name": os.getenv("DB_NAME", "app_db"),
                    "user": os.getenv("DB_USER", "postgres"),
                    "password": os.getenv("DB_PASSWORD", "postgres"),
                    "pool_size": 5,
                    "pool_timeout": 30,
                }
            }

            config_file = self.config_dir / f"database_{self.env}.yaml"
            with open(config_file, "w") as f:
                yaml.dump(config, f)

            self.logger.info("Database configuration initialized")
            return True
        except Exception as e:
            self.logger.error(f"Database configuration failed: {str(e)}")
            return False

    def initialize_app_config(self) -> bool:
        """Initialize application configuration"""
        try:
            config = {
                "app": {
                    "name": "MyApp",
                    "environment": self.env,
                    "debug": self.env == "development",
                    "secret_key": os.urandom(24).hex(),
                    "allowed_hosts": ["localhost", "127.0.0.1"],
                    "log_level": "DEBUG" if self.env == "development" else "INFO",
                }
            }

            config_file = self.config_dir / f"app_{self.env}.yaml"
            with open(config_file, "w") as f:
                yaml.dump(config, f)

            self.logger.info("Application configuration initialized")
            return True
        except Exception as e:
            self.logger.error(f"Application configuration failed: {str(e)}")
            return False

    def reset_migrations(self) -> bool:
        """Reset and reinitialize database migrations"""
        try:
            backup_path = None
            # Backup existing migrations
            if self.migrations_dir.exists():
                backup_path = self._create_backup()
                # Remove existing migrations
                shutil.rmtree(self.migrations_dir)

            # Create a minimal Flask application for migrations
            from flask import Flask
            from flask_migrate import Migrate
            from flask_sqlalchemy import SQLAlchemy

            app = Flask(__name__)
            app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
            app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

            db = SQLAlchemy(app)
            migrate = Migrate(app, db)

            # Initialize new migrations
            with app.app_context():
                # Create migrations directory if it doesn't exist
                if not self.migrations_dir.exists():
                    os.makedirs(self.migrations_dir)

                # Initialize migrations
                try:
                    subprocess.run(
                        ["flask", "db", "init"],
                        check=True,
                        env={**os.environ, "FLASK_APP": "app.py"},
                    )

                    # Create and apply initial migration
                    subprocess.run(
                        ["flask", "db", "migrate", "-m", "Initial migration"],
                        check=True,
                        env={**os.environ, "FLASK_APP": "app.py"},
                    )
                    subprocess.run(
                        ["flask", "db", "upgrade"],
                        check=True,
                        env={**os.environ, "FLASK_APP": "app.py"},
                    )

                    self.logger.info("Migrations reset successfully")
                    return True
                except subprocess.CalledProcessError as e:
                    self.logger.error(f"Migration command failed: {str(e)}")
                    if backup_path:
                        self.restore_backup(backup_path)
                    return False

        except Exception as e:
            self.logger.error(f"Migration reset failed: {str(e)}")
            if backup_path:
                self.restore_backup(backup_path)
            return False

    def verify_system(self) -> Dict[str, bool]:
        """Verify system configuration and state"""
        status = {
            "config_exists": False,
            "migrations_exist": False,
            "database_config_valid": False,
            "app_config_valid": False,
        }

        try:
            # Check configurations
            status["config_exists"] = self.config_dir.exists()
            status["migrations_exist"] = self.migrations_dir.exists()

            # Verify database configuration
            db_config = self.config_dir / f"database_{self.env}.yaml"
            if db_config.exists():
                with open(db_config) as f:
                    config = yaml.safe_load(f)
                    status["database_config_valid"] = "database" in config

            # Verify application configuration
            app_config = self.config_dir / f"app_{self.env}.yaml"
            if app_config.exists():
                with open(app_config) as f:
                    config = yaml.safe_load(f)
                    status["app_config_valid"] = "app" in config

            return status
        except Exception as e:
            self.logger.error(f"System verification failed: {str(e)}")
            return status

    @contextmanager
    def safe_operation(self):
        """Context manager for safe system operations"""
        backup_path = None
        try:
            backup_path = self._create_backup()
            yield
        except Exception as e:
            self.logger.error(f"Operation failed: {str(e)}")
            if backup_path:
                self.restore_backup(backup_path)
            raise
        finally:
            self.logger.info("Operation completed")


def deploy_system():
    """Deploy and configure the system"""
    manager = SystemManager()

    try:
        with manager.safe_operation():
            # Verify current state
            status = manager.verify_system()

            if not all(status.values()):
                print("System needs initialization...")

                # Clean existing setup if needed
                if not manager.clean_system():
                    raise Exception("System cleanup failed")

                # Initialize configurations
                if not manager.initialize_database_config():
                    raise Exception("Database configuration failed")

                if not manager.initialize_app_config():
                    raise Exception("Application configuration failed")

                # Reset migrations with proper Flask context
                if not manager.reset_migrations():
                    raise Exception("Migration reset failed")

                # Verify final state
                final_status = manager.verify_system()
                if not all(final_status.values()):
                    raise Exception("System verification failed")

                print("System deployed successfully!")
                return True
            print("System is already properly configured.")
            return True

    except Exception as e:
        print(f"Deployment failed: {str(e)}")
        return False


if __name__ == "__main__":
    # Set up environment for deployment
    os.environ.setdefault("APP_ENV", "development")
    os.environ.setdefault("FLASK_ENV", "development")
    os.environ.setdefault("FLASK_APP", "app.py")

    if deploy_system():
        print("System deployment completed successfully!")
    else:
        print("System deployment failed!")
        sys.exit(1)

if __name__ == "__main__":
    deploy_system()
