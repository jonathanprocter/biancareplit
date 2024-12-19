from datetime import datetime
from extensions import db

class StudentProgress(db.Model):
    __tablename__ = 'student_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    total_time = db.Column(db.Integer, default=0)  # Total study time in minutes
    cards_reviewed = db.Column(db.Integer, default=0)
    accuracy = db.Column(db.Float, default=0.0)
    streak = db.Column(db.Integer, default=0)
    category_progress = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_update = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'totalTime': self.total_time,
            'cardsReviewed': self.cards_reviewed,
            'accuracy': self.accuracy,
            'streak': self.streak,
            'categoryProgress': self.category_progress,
            'lastUpdate': self.last_update.isoformat() if self.last_update else None
        }
