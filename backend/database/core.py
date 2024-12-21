from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

db = SQLAlchemy()
migrate = Migrate()


def init_db(app):
    """Initialize database and migrations"""
    try:
        db.init_app(app)
        migrate.init_app(app, db)

        with app.app_context():
            db.create_all()
            db_path = Path(
                app.config["SQLALCHEMY_DATABASE_URI"].replace("sqlite:///", "")
            )
            if not db_path.parent.exists():
                db_path.parent.mkdir(parents=True)
            logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise
