"""Flask extensions initialization."""

from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()


def init_extensions(app):
    """Initialize Flask extensions"""
    try:
        # Initialize SQLAlchemy
        db.init_app(app)

        # Initialize Flask-Migrate
        migrate.init_app(app, db)

        # Create tables if they don't exist
        with app.app_context():
            db.create_all()
            logger.info("Database tables initialized successfully")

        logger.info("Extensions initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize extensions: {str(e)}")
        raise
