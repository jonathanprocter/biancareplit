
#!/usr/bin/env python3
"""Initialize database and migrations."""
import sys
import logging
from pathlib import Path
from flask import Flask
from flask_migrate import Migrate, init as init_migrations
from flask_migrate import migrate as create_migration
from flask_migrate import upgrade as apply_migration
from sqlalchemy import text

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

def create_app():
    """Create Flask application."""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    from backend.database.db_config import db
    db.init_app(app)
    
    return app, db

def initialize_database():
    """Initialize fresh database and migrations"""
    try:
        app, db = create_app()
        migrate = Migrate(app, db)

        with app.app_context():
            migrations_dir = Path("migrations")
            if not migrations_dir.exists():
                init_migrations("migrations")
                logger.info("Initialized migrations directory")

            create_migration(directory="migrations", message="Initial migration")
            logger.info("Created initial migration")

            apply_migration()
            logger.info("Applied initial migration")

            db.create_all()
            logger.info("Database tables created successfully")

            db.session.execute(text("SELECT 1"))
            db.session.commit()
            logger.info("Database connection verified")

        return True
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        return False

if __name__ == "__main__":
    if initialize_database():
        logger.info("Database initialization completed successfully")
        sys.exit(0)
    else:
        logger.error("Database initialization failed")
        sys.exit(1)
