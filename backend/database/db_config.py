from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os
import logging

db = SQLAlchemy()
migrate = Migrate()
logger = logging.getLogger(__name__)


class DatabaseConfig:
    @staticmethod
    def init_app(app: Flask) -> None:
        try:
            database_url = os.getenv(
                "DATABASE_URL", "postgresql://postgres:postgres@0.0.0.0:5432/postgres"
            )
            app.config["SQLALCHEMY_DATABASE_URI"] = database_url
            app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
            app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
                "pool_size": 20,
                "pool_timeout": 30,
                "pool_recycle": 3600,
                "max_overflow": 10,
                "echo": False,
            }

            db.init_app(app)
            migrate.init_app(app, db)

            with app.app_context():
                db.create_all()
                db.session.execute("SELECT 1")
                logger.info("Database connection established successfully")

        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            raise
