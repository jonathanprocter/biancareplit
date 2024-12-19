
from datetime import datetime, timedelta
import logging
from typing import Dict, Any

from models.nclex_analytics import NCLEXAnalytics
from services.analytics_service import AnalyticsService
from services.ai_coach_service import AICoachService

class MorningGreetingService:
    def __init__(self):
        self.analytics_service = AnalyticsService()
        self.ai_coach_service = AICoachService()
        self.logger = logging.getLogger(__name__)

    async def generate_morning_greeting(self, user_id: str) -> Dict[str, Any]:
        try:
            # Get yesterday's date range
            yesterday = datetime.now() - timedelta(days=1)
            start_date = yesterday.replace(hour=0, minute=0, second=0)
            end_date = yesterday.replace(hour=23, minute=59, second=59)

            # Get analytics data
            analytics_data = await self.analytics_service.get_dashboard_data(
                user_id=user_id,
                date_range='day'
            )

            # Get AI coach interactions
            session_data = await self.analytics_service.get_session_data(
                user_id=user_id,
                start_date=start_date,
                end_date=end_date
            )

            # Get NCLEX predictions
            nclex_analytics = NCLEXAnalytics.query.filter_by(user_id=user_id).first()
            predictions = {}
            if nclex_analytics:
                for topic, data in analytics_data.get('topic_mastery', {}).items():
                    predictions[topic] = nclex_analytics.predict_nclex_performance({
                        'correct_answers': data.get('correct', 0),
                        'total_attempts': data.get('total', 1),
                        'avg_difficulty': data.get('difficulty', 1),
                        'consistency_score': data.get('consistency', 0.5)
                    })

            return {
                'date': yesterday.strftime('%Y-%m-%d'),
                'performance': analytics_data,
                'ai_coach_interactions': session_data.get('ai_coach_interactions', []),
                'nclex_predictions': predictions
            }

        except Exception as e:
            self.logger.error(f"Error generating morning greeting: {str(e)}")
            raise
