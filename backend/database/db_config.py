
import os
import logging
from typing import Optional, Dict, Any
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

logger = logging.getLogger(__name__)

db = SQLAlchemy()
migrate = Migrate()

class DatabaseConfig:
    """Database configuration manager"""
    def __init__(self, app: Optional[Flask] = None):
        self.app = app
        if app is not None:
            self.init_app(app)

    def init_app(self, app: Flask) -> None:
        """Initialize database with Flask application"""
        try:
            app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
            app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
            
            db.init_app(app)
            migrate.init_app(app, db)
            
            with app.app_context():
                db.create_all()
                logger.info("Database initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            raise
