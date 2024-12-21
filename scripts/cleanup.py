import os
import shutil
import logging
from pathlib import Path
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def create_backup(path: Path, backup_dir: Path) -> Path:
    """Create a backup of the specified path"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"migration_backup_{timestamp}"

    if path.exists():
        if path.is_dir():
            shutil.copytree(path, backup_path)
        else:
            shutil.copy2(path, backup_path)
        logger.info(f"Created backup at: {backup_path}")
    return backup_path


def cleanup_system():
    """Perform complete system cleanup"""
    try:
        # Create backup directories
        backup_root = Path("backups")
        migrations_backup = backup_root / "migrations"
        migrations_backup.mkdir(parents=True, exist_ok=True)

        # Backup and remove migrations
        migrations_dir = Path("migrations")
        if migrations_dir.exists():
            backup_path = create_backup(migrations_dir, migrations_backup)
            logger.info(f"Backup created at: {backup_path}")
            shutil.rmtree(migrations_dir)
            logger.info("Removed existing migrations directory")

        # Remove cache files
        cache_patterns = ["__pycache__", ".pytest_cache", ".mypy_cache"]
        for pattern in cache_patterns:
            for cache_dir in Path(".").rglob(pattern):
                shutil.rmtree(cache_dir)
                logger.info(f"Removed cache directory: {cache_dir}")

        # Remove logs but keep the directory
        logs_dir = Path("logs")
        if logs_dir.exists():
            for log_file in logs_dir.glob("*.log*"):
                log_file.unlink()
            logger.info("Cleared log files")

        # Create/ensure required directories
        required_dirs = ["migrations", "logs", "instance", "config"]
        for dir_name in required_dirs:
            os.makedirs(dir_name, exist_ok=True)
            logger.info(f"Ensured directory exists: {dir_name}")

        return True

    except Exception as e:
        logger.error(f"Cleanup failed: {str(e)}")
        return False


def init_new_migrations(app):
    """Initialize fresh migrations"""
    try:
        from flask_migrate import init, migrate, upgrade

        # Initialize migrations directory
        init("migrations")
        logger.info("Initialized migrations directory")

        # Create initial migration
        with app.app_context():
            migrate()
            logger.info("Created initial migration")

            # Apply migration
            upgrade()
            logger.info("Applied initial migration")

        return True
    except Exception as e:
        logger.error(f"Error initializing migrations: {e}")
        return False


if __name__ == "__main__":
    if cleanup_system():
        logger.info("System cleanup completed successfully")
    else:
        logger.error("System cleanup failed")
