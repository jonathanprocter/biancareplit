
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from .base import Base

class CyberContent(Base):
    __tablename__ = 'cyber_content'
    
    id = Column(Integer, primary_key=True)
    topic = Column(String(100), nullable=False)  # e.g., "Network Security", "Cryptography"
    subtopic = Column(String(100))  # e.g., "Firewalls", "Public Key Infrastructure"
    difficulty = Column(String(20))  # "Beginner", "Intermediate", "Advanced"
    content_type = Column(String(50))  # "Concept", "Practice", "Lab"
    question = Column(Text)
    answer = Column(Text)
    explanation = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    tags = Column(String(200))  # "Security+, Network+, CISSP" etc
