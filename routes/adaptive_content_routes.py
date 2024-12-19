from flask import Blueprint, jsonify, request
from models import db, Review, Flashcard, StudyMaterial
from datetime import datetime, timedelta
from sqlalchemy import func
import numpy as np
from sklearn.preprocessing import StandardScaler
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

adaptive_content_bp = Blueprint('adaptive_content', __name__, url_prefix='/api')

@adaptive_content_bp.route('/learning-patterns', methods=['GET'])
def get_learning_patterns():
    """Get user's learning patterns"""
    try:
        # Get user's review history
        reviews = Review.query.order_by(Review.created_at.desc()).limit(100).all()
        
        # Calculate patterns
        patterns = {
            'currentLevel': calculate_current_level(reviews),
            'preferredStyle': determine_learning_style(reviews),
            'weakAreas': identify_weak_areas(reviews),
            'insights': generate_learning_insights(reviews)
        }
        
        return jsonify(patterns)
    except Exception as e:
        logger.error(f"Error getting learning patterns: {str(e)}")
        return jsonify({'error': 'Failed to retrieve learning patterns'}), 500

@adaptive_content_bp.route('/performance-data', methods=['GET'])
def get_performance_data():
    """Get user's performance data"""
    try:
        reviews = Review.query.order_by(Review.created_at.desc()).limit(100).all()
        
        performance_data = {
            'overallProgress': calculate_overall_progress(reviews),
            'masteredTopics': count_mastered_topics(reviews),
            'studyStreak': calculate_study_streak(),
            'recentPerformance': get_recent_performance(reviews)
        }
        
        return jsonify(performance_data)
    except Exception as e:
        logger.error(f"Error getting performance data: {str(e)}")
        return jsonify({'error': 'Failed to retrieve performance data'}), 500

@adaptive_content_bp.route('/adaptive-content/generate', methods=['POST'])
def generate_adaptive_content():
    """Generate adaptive content based on patterns"""
    try:
        data = request.json
        patterns = data.get('learningPatterns')
        performance = data.get('performanceData')
        
        # Generate content based on patterns and performance
        content = {
            'id': generate_content_id(),
            'question': generate_adaptive_question(patterns, performance),
            'options': generate_question_options(),
            'difficulty': determine_optimal_difficulty(patterns),
            'topic': select_next_topic(patterns),
            'tags': generate_content_tags(patterns)
        }
        
        return jsonify(content)
    except Exception as e:
        logger.error(f"Error generating adaptive content: {str(e)}")
        return jsonify({'error': 'Failed to generate adaptive content'}), 500

@adaptive_content_bp.route('/adaptive-content/submit-answer', methods=['POST'])
def submit_answer():
    """Submit and process answer"""
    try:
        data = request.json
        content_id = data.get('contentId')
        answer = data.get('answer')
        time_spent = data.get('timeSpent')
        
        # Process the answer and generate feedback
        result = {
            'correct': evaluate_answer(content_id, answer),
            'feedback': generate_feedback(content_id, answer),
            'patterns': update_learning_patterns(content_id, answer, time_spent)
        }
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error submitting answer: {str(e)}")
        return jsonify({'error': 'Failed to process answer'}), 500

def calculate_study_streak():
    """Calculate the current study streak in days"""
    try:
        today = datetime.utcnow().date()
        streak = 0
        current_date = today
        
        while True:
            # Check if there was any activity on this date
            activity = db.session.query(Review).filter(
                func.date(Review.created_at) == current_date
            ).first()
            
            if not activity:
                break
                
            streak += 1
            current_date -= timedelta(days=1)
            
        return streak
    except Exception as e:
        logger.error(f"Error calculating study streak: {str(e)}")
        return 0

# Helper functions for pattern analysis and content generation
def calculate_current_level(reviews):
    if not reviews:
        return 'Beginner'
    # Implement level calculation logic
    return 'Intermediate'

def determine_learning_style(reviews):
    if not reviews:
        return 'Visual'
    # Implement learning style detection
    return 'Visual'

def identify_weak_areas(reviews):
    if not reviews:
        return []
    # Implement weak areas identification
    return ['Topic A', 'Topic B']

def generate_learning_insights(reviews):
    if not reviews:
        return []
    # Generate learning insights
    return [
        {
            'title': 'Study Pattern Analysis',
            'description': 'You learn best during evening hours'
        }
    ]

def calculate_overall_progress(reviews):
    if not reviews:
        return 0
    # Calculate progress percentage
    return 65

def count_mastered_topics(reviews):
    if not reviews:
        return 0
    # Count mastered topics
    return 3

def get_recent_performance(reviews):
    if not reviews:
        return []
    # Get recent performance data
    return [{'date': r.created_at, 'score': r.score} for r in reviews[:5]]

def generate_content_id():
    return datetime.utcnow().timestamp()

def generate_adaptive_question(patterns, performance):
    # Generate question based on patterns
    return "What is the primary function of the adaptive learning system?"

def generate_question_options():
    # Generate options
    return [
        "Pattern recognition",
        "Content adaptation",
        "Performance tracking",
        "All of the above"
    ]

def determine_optimal_difficulty(patterns):
    # Determine difficulty
    return "Intermediate"

def select_next_topic(patterns):
    # Select topic
    return "Adaptive Learning Systems"

def generate_content_tags(patterns):
    # Generate tags
    return ["adaptive", "learning", "patterns"]

def evaluate_answer(content_id, answer):
    """Evaluate the correctness of an answer"""
    try:
        content = Content.query.get(content_id)
        if not content:
            raise ValueError("Content not found")
            
        # Compare answer with correct answer from content
        is_correct = (str(answer).strip().lower() == str(content.correct_answer).strip().lower())
        
        # Update content metrics
        content.total_attempts = (content.total_attempts or 0) + 1
        content.correct_attempts = (content.correct_attempts or 0) + (1 if is_correct else 0)
        db.session.commit()
        
        return is_correct
    except Exception as e:
        logger.error(f"Error evaluating answer: {str(e)}")
        return False

def generate_feedback(content_id, answer):
    """Generate detailed feedback for the answer"""
    try:
        content = Content.query.get(content_id)
        if not content:
            raise ValueError("Content not found")
            
        is_correct = evaluate_answer(content_id, answer)
        
        feedback = {
            'correct': is_correct,
            'message': 'Correct! Excellent work!' if is_correct else 'Not quite right. Let\'s review this.',
            'explanation': content.explanation if content.explanation else content.rationale,
            'keyPoints': content.key_points if hasattr(content, 'key_points') else [],
            'relatedConcepts': content.related_concepts if hasattr(content, 'related_concepts') else [],
            'suggestedResources': []
        }
        
        # Add suggested resources if answer was incorrect
        if not is_correct and hasattr(content, 'study_resources'):
            feedback['suggestedResources'] = content.study_resources
            
        return feedback
    except Exception as e:
        logger.error(f"Error generating feedback: {str(e)}")
        return {
            'message': 'Error generating feedback',
            'explanation': 'Please try again or contact support if the issue persists.'
        }

def update_learning_patterns(content_id, answer, time_spent):
    """Update learning patterns based on user interaction"""
    try:
        content = Content.query.get(content_id)
        if not content:
            raise ValueError("Content not found")
            
        is_correct = evaluate_answer(content_id, answer)
        
        # Get or create adaptive pattern record
        pattern = AdaptivePattern.query.filter_by(
            category=content.category
        ).first() or AdaptivePattern(category=content.category)
        
        # Update pattern metrics
        pattern.total_questions = (pattern.total_questions or 0) + 1
        pattern.correct_answers = (pattern.correct_answers or 0) + (1 if is_correct else 0)
        pattern.total_time = (pattern.total_time or 0) + time_spent
        
        # Calculate average time and accuracy
        pattern.avg_time_per_question = pattern.total_time / pattern.total_questions
        pattern.accuracy_rate = (pattern.correct_answers / pattern.total_questions) * 100
        
        # Determine current level based on accuracy
        if pattern.accuracy_rate >= 80:
            current_level = 'Advanced'
        elif pattern.accuracy_rate >= 60:
            current_level = 'Intermediate'
        else:
            current_level = 'Beginner'
            
        # Save pattern updates
        db.session.add(pattern)
        db.session.commit()
        
        return {
            'currentLevel': current_level,
            'preferredStyle': determine_learning_style(pattern),
            'weakAreas': identify_weak_areas([pattern]),
            'recommendedDifficulty': 'Advanced' if pattern.accuracy_rate > 80 else 'Intermediate'
        }
    except Exception as e:
        logger.error(f"Error updating learning patterns: {str(e)}")
        raise