"""Clean up migrations directory and database files"""
import os
import sys
import logging
from pathlib import Path
from datetime import datetime

# Add the project root to Python path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from backend.database.migration_resolver import MigrationResolver
from backend.database.db_config_manager import get_db_manager
from flask import Flask
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
                logger.info("Migrations synchronized successfully!")
                return True
                
            # If synchronization fails, start fresh
            logger.info("Starting fresh migration setup...")
            if resolver.clean_migrations():
                logger.info("Fresh migration setup completed successfully!")
                return True
            
            return False
            
    except Exception as e:
        logger.error(f'Error during cleanup: {e}')
        return False

if __name__ == '__main__':
    cleanup_migrations()