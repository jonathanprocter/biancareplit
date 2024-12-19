
"""Initialize database migrations."""
import logging
from flask import Flask
from flask_migrate import Migrate, init, migrate
from pathlib import Path
from backend.database.db_config import db, DatabaseConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_migrations():
    """Initialize database migrations."""
    try:
        # Create app context
        app = Flask(__name__)
        db_config = DatabaseConfig()
        db_config.init_app(app)
        
        # Initialize migrations directory
        migrations_dir = Path("migrations")
        if not migrations_dir.exists():
            logger.info("Creating migrations directory")
            init()
        
        # Setup migration environment
        migrate = Migrate(app, db)
        
        # Create initial migration
        logger.info("Creating initial migration")
        with app.app_context():
            migrate = Migrate(app, db)
            migrate.init_app(app, db)
            migrate("Initial migration")
            
        return True
    except Exception as e:
        logger.error(f"Failed to initialize migrations: {str(e)}")
        raise

if __name__ == "__main__":
    init_migrations()
