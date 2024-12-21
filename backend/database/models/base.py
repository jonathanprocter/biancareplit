from datetime import datetime
from ..core import db


class BaseModel(db.Model):
    """Base model class"""

    __abstract__ = True

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def save(self):
        """Save the model instance"""
        db.session.add(self)
        db.session.commit()

    def delete(self):
        """Delete the model instance"""
        db.session.delete(self)
        db.session.commit()

    @classmethod
    def get_by_id(cls, id):
        """Get a record by ID"""
        return cls.query.get(id)

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            column.name: getattr(self, column.name) for column in self.__table__.columns
        }
