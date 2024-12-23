async def _generate_dashboard_insights(
    self, user_id: str, performance_data: List[Dict], topic_mastery: List[Dict]
) -> List[Dict]:
    """Generate insights for dashboard"""
    insights = []

    # Mock implementation
    if performance_data and performance_data[-1]["score"] >= 85:
        insights.append(
            {
                "type": "performance",
                "title": "Strong Performance",
                "description": "Your recent performance has been excellent.",
                "significance": 0.9,
            }
        )

    for topic in topic_mastery:
        if topic["score"] >= 85:
            insights.append(
                {
                    "type": "topic_mastery",
                    "title": f"Strong in {topic['topic']}",
                    "description": f"You're showing strong understanding of {topic['topic']}.",
                    "significance": 0.7,
                }
            )
        elif topic["score"] <= 60:
            insights.append(
                {
                    "type": "topic_weakness",
                    "title": f"Review {topic['topic']}",
                    "description": f"Additional practice in {topic['topic']} recommended.",
                    "significance": 0.8,
                }
            )

    return insights
