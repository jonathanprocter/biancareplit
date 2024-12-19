
from datetime import datetime, timedelta
from models import Flashcard, AdaptivePattern
from typing import Dict, Any

class LearningIntegrationService:
    def __init__(self, db):
        self.db = db
        
    def convert_missed_question(self, question_data: Dict[str, Any]) -> Flashcard:
        """Convert missed quiz question to flashcard with detailed tagging"""
        flashcard = Flashcard(
            front=question_data['question'],
            back=question_data['correct_answer'],
            difficulty=question_data['difficulty'],
            clinical_notes=question_data.get('explanation', ''),
            category=question_data.get('category'),
            topic_tags=question_data.get('tags', []),
            subtopic_tags=question_data.get('subtopics', []),
            nclex_category=question_data.get('nclex_category'),
            difficulty_metrics={
                'base_difficulty': question_data['difficulty'],
                'student_performance': question_data.get('performance_history', {}),
                'topic_mastery': question_data.get('topic_mastery_level', 0)
            },
            interval=1,  # Initial interval for SRS
            easiness=2.5,  # Initial easiness factor
            next_review=datetime.utcnow(),
            answer_stats={
                'attempts': 1,
                'correct': 0,
                'last_attempt_timestamp': datetime.utcnow().isoformat()
            }
        )
        return flashcard

    def calculate_next_review(self, card: Flashcard, quality: int) -> datetime:
        """Calculate next review time using SuperMemo SM-2 algorithm"""
        if quality >= 3:  # Correct response
            if card.consecutive_correct == 0:
                interval = 1
            elif card.consecutive_correct == 1:
                interval = 6
            else:
                interval = round(card.interval * card.easiness)
            
            card.consecutive_correct += 1
        else:  # Incorrect response
            interval = 1
            card.consecutive_correct = 0
        
        # Update easiness factor
        card.easiness = max(1.3, card.easiness + (0.1 - (5 - quality) * 0.08))
        card.interval = interval
        
        return datetime.utcnow() + timedelta(days=interval)
