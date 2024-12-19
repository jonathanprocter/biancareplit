from datetime import datetime
from extensions import db

class Review(db.Model):
    __tablename__ = 'review'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.Integer, db.ForeignKey('content.id', ondelete='CASCADE'), nullable=False)
    rating = db.Column(db.Integer, nullable=True)
    is_correct = db.Column(db.Boolean, nullable=False, default=False)
    time_taken = db.Column(db.Integer, nullable=True)  # Time in seconds
    study_duration = db.Column(db.Integer, nullable=True)  # Total study duration in minutes
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_anonymous = db.Column(db.Boolean, nullable=False, default=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'content_id': self.content_id,
            'rating': self.rating,
            'is_correct': self.is_correct,
            'time_taken': self.time_taken,
            'study_duration': self.study_duration,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_anonymous': self.is_anonymous
        }
