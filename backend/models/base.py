"""Base model for SQLAlchemy models."""
from datetime import datetime
from backend.database.db_config import db

class BaseModel(db.Model):
    """Base model class that includes CRUD convenience methods."""
    
    __abstract__ = True

    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
