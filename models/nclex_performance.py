from datetime import datetime
from extensions import db


class NCLEXPerformance(db.Model):
    __tablename__ = "nclex_performance"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    client_needs = db.Column(db.String(50), nullable=False)
    cognitive_level = db.Column(db.String(30), nullable=False)
    score = db.Column(db.Float, nullable=False)
    time_taken = db.Column(db.Integer, nullable=False)  # in seconds
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "client_needs": self.client_needs,
            "cognitive_level": self.cognitive_level,
            "score": self.score,
            "time_taken": self.time_taken,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
