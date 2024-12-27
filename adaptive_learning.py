import logging
from datetime import datetime

from sqlalchemy import func

from models.adaptive_learning import AdaptivePattern
from models.content import Content, Review

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AdaptiveLearningSystem:
    def __init__(self, db_connection=None):
        self.db = db_connection

    def analyze_student_patterns(self, user_id):
        try:
            reviews = (
                Review.query.filter_by(user_id=user_id)
                .order_by(Review.created_at.desc())
                .limit(100)
                .all()
            )

            pattern_data = {
                "accuracy_rate": self._calculate_accuracy(reviews),
                "study_time_distribution": self._analyze_study_times(reviews),
                "topic_mastery": self._evaluate_topic_mastery(reviews),
                "learning_style": self._determine_learning_style(reviews),
            }

            return pattern_data
        except Exception as e:
            logger.error(f"Error analyzing student patterns: {str(e)}")
            raise

    def generate_adaptive_content(self, user_id, topic=None):
        try:
            patterns = (
                AdaptivePattern.query.filter_by(user_id=user_id)
                .order_by(AdaptivePattern.created_at.desc())
                .first()
            )

            content = self._select_content(patterns, topic)
            return content
        except Exception as e:
            logger.error(f"Error generating adaptive content: {str(e)}")
            raise

    @staticmethod
    def track_response_patterns(user_id, response_data):
        try:
            pattern_data = {
                "response_time": response_data.get("time_taken"),
                "accuracy": response_data.get("is_correct"),
                "confidence": response_data.get("confidence_level"),
                "timestamp": datetime.utcnow(),
            }

            AdaptivePattern.store_pattern(user_id, "response", pattern_data)
            return True
        except Exception as e:
            logger.error(f"Error tracking response patterns: {str(e)}")
            raise

    @staticmethod
    def _calculate_accuracy(reviews):
        if not reviews:
            return {"overall": 0.0, "by_category": {}, "trend": []}

        correct = sum(1 for r in reviews if r.is_correct)
        overall = (correct / len(reviews)) * 100

        category_stats = {}
        for review in reviews:
            if review.content and review.content.category:
                category = review.content.category.value
                if category not in category_stats:
                    category_stats[category] = {"correct": 0, "total": 0}
                category_stats[category]["total"] += 1
                if review.is_correct:
                    category_stats[category]["correct"] += 1

        by_category = {
            category: (stats["correct"] / stats["total"] * 100)
            for category, stats in category_stats.items()
        }

        trend = []
        for i in range(0, len(reviews), 5):
            batch = reviews[i : i + 5]
            batch_correct = sum(1 for r in batch if r.is_correct)
            trend.append((batch_correct / len(batch)) * 100)

        return {"overall": overall, "by_category": by_category, "trend": trend}

    @staticmethod
    def _analyze_study_times(reviews):
        if not reviews:
            return {
                "average_time": 0,
                "total_time": 0,
                "by_difficulty": {},
                "by_time_of_day": {},
                "session_lengths": [],
            }

        total_time = sum(r.time_taken for r in reviews)
        avg_time = total_time / len(reviews)

        difficulty_times = {}
        for review in reviews:
            if review.content and review.content.difficulty:
                diff = review.content.difficulty.value
                if diff not in difficulty_times:
                    difficulty_times[diff] = []
                difficulty_times[diff].append(review.time_taken)

        by_difficulty = {
            diff: sum(times) / len(times) for diff, times in difficulty_times.items()
        }

        time_of_day = {"morning": [], "afternoon": [], "evening": [], "night": []}

        for review in reviews:
            hour = review.created_at.hour
            if 5 <= hour < 12:
                time_of_day["morning"].append(review.time_taken)
            elif 12 <= hour < 17:
                time_of_day["afternoon"].append(review.time_taken)
            elif 17 <= hour < 22:
                time_of_day["evening"].append(review.time_taken)
            else:
                time_of_day["night"].append(review.time_taken)

        by_time_of_day = {
            period: sum(times) / len(times) if times else 0
            for period, times in time_of_day.items()
        }

        session_lengths = []
        current_session = 0
        last_time = None

        for review in sorted(reviews, key=lambda x: x.created_at):
            if (
                last_time and (review.created_at - last_time).seconds > 1800
            ):  # 30 min break
                if current_session > 0:
                    session_lengths.append(current_session)
                current_session = review.time_taken
            else:
                current_session += review.time_taken
            last_time = review.created_at

        if current_session > 0:
            session_lengths.append(current_session)

        return {
            "average_time": avg_time,
            "total_time": total_time,
            "by_difficulty": by_difficulty,
            "by_time_of_day": by_time_of_day,
            "session_lengths": session_lengths,
        }

    @staticmethod
    def _evaluate_topic_mastery(reviews):
        if not reviews:
            return {
                "mastery_levels": {},
                "weak_areas": [],
                "strong_areas": [],
                "recommended_focus": [],
                "mastery_timeline": {},
            }

        topic_stats = {}
        for review in reviews:
            if review.content and review.content.category:
                topic = review.content.category.value
                if topic not in topic_stats:
                    topic_stats[topic] = {
                        "correct": 0,
                        "total": 0,
                        "streak": 0,
                        "max_streak": 0,
                        "recent_performance": [],
                        "difficulty_performance": {
                            "beginner": [],
                            "intermediate": [],
                            "advanced": [],
                        },
                    }

                stats = topic_stats[topic]
                stats["total"] += 1

                if review.is_correct:
                    stats["correct"] += 1
                    stats["streak"] += 1
                    stats["max_streak"] = max(stats["streak"], stats["max_streak"])
                else:
                    stats["streak"] = 0

                stats["recent_performance"].append(review.is_correct)
                if len(stats["recent_performance"]) > 5:
                    stats["recent_performance"].pop(0)

                if review.content.difficulty:
                    diff_level = review.content.difficulty.value.lower()
                    if diff_level in stats["difficulty_performance"]:
                        stats["difficulty_performance"][diff_level].append(
                            review.is_correct
                        )

        mastery_levels = {}
        weak_areas = []
        strong_areas = []
        for topic, stats in topic_stats.items():
            if stats["total"] < 5:  # Not enough data
                continue

            overall_accuracy = (stats["correct"] / stats["total"]) * 100
            recent_accuracy = (
                sum(stats["recent_performance"]) / len(stats["recent_performance"])
            ) * 100

            difficulty_mastery = {}
            for diff, results in stats["difficulty_performance"].items():
                if results:
                    difficulty_mastery[diff] = (sum(results) / len(results)) * 100

            mastery_levels[topic] = {
                "overall_accuracy": overall_accuracy,
                "recent_accuracy": recent_accuracy,
                "max_streak": stats["max_streak"],
                "current_streak": stats["streak"],
                "difficulty_mastery": difficulty_mastery,
                "total_attempts": stats["total"],
            }

            if overall_accuracy < 70 or recent_accuracy < 60:
                weak_areas.append(
                    {
                        "topic": topic,
                        "reason": (
                            "Low accuracy"
                            if overall_accuracy < 70
                            else "Recent struggles"
                        ),
                        "accuracy": overall_accuracy,
                    }
                )
            elif overall_accuracy > 85 and recent_accuracy > 80:
                strong_areas.append(
                    {
                        "topic": topic,
                        "mastery_level": (
                            "Advanced"
                            if difficulty_mastery.get("advanced", 0) > 70
                            else "Intermediate"
                        ),
                        "accuracy": overall_accuracy,
                    }
                )

        recommended_focus = []
        for area in weak_areas:
            topic = area["topic"]
            if topic in mastery_levels:
                mastery = mastery_levels[topic]
                if mastery["total_attempts"] < 10:
                    recommended_focus.append(
                        {
                            "topic": topic,
                            "reason": "Need more practice",
                            "priority": "High",
                        }
                    )
                elif mastery["recent_accuracy"] < 60:
                    recommended_focus.append(
                        {
                            "topic": topic,
                            "reason": "Recent performance drop",
                            "priority": "Medium",
                        }
                    )

        return {
            "mastery_levels": mastery_levels,
            "weak_areas": weak_areas,
            "strong_areas": strong_areas,
            "recommended_focus": recommended_focus,
        }

    def _determine_learning_style(self, reviews):
        if not reviews:
            return {
                "primary_style": "visual",
                "style_effectiveness": {},
                "recommendations": [],
            }

        content_performance = {
            "visual": {"correct": 0, "total": 0, "avg_time": []},
            "verbal": {"correct": 0, "total": 0, "avg_time": []},
            "interactive": {"correct": 0, "total": 0, "avg_time": []},
        }

        for review in reviews:
            if not review.content:
                continue

            content_type = self._categorize_content_type(review.content)

            if content_type in content_performance:
                stats = content_performance[content_type]
                stats["total"] += 1
                if review.is_correct:
                    stats["correct"] += 1
                stats["avg_time"].append(review.time_taken)

        style_effectiveness = {}
        for style, stats in content_performance.items():
            if stats["total"] > 0:
                accuracy = (stats["correct"] / stats["total"]) * 100
                avg_time = (
                    sum(stats["avg_time"]) / len(stats["avg_time"])
                    if stats["avg_time"]
                    else 0
                )
                effectiveness = (accuracy * 0.7) + (
                    (1000 - min(avg_time, 1000)) * 0.3 / 10
                )
                style_effectiveness[style] = effectiveness

        primary_style = (
            max(style_effectiveness.items(), key=lambda x: x[1])[0]
            if style_effectiveness
            else "visual"
        )

        recommendations = []
        if primary_style == "visual":
            recommendations.extend(
                [
                    "Use diagrams and charts for complex concepts",
                    "Create mind maps for topic relationships",
                    "Watch video demonstrations",
                ]
            )
        elif primary_style == "verbal":
            recommendations.extend(
                [
                    "Focus on written explanations",
                    "Use mnemonics for memorization",
                    "Practice explaining concepts out loud",
                ]
            )
        elif primary_style == "interactive":
            recommendations.extend(
                [
                    "Engage in practice exercises",
                    "Use interactive simulations",
                    "Participate in group discussions",
                ]
            )

        return {
            "primary_style": primary_style,
            "style_effectiveness": style_effectiveness,
            "recommendations": recommendations,
        }

    @staticmethod
    def _select_content(patterns, topic=None):
        try:
            query = Content.query

            if topic:
                query = query.filter_by(category=topic)

            if patterns and patterns.pattern_data:
                accuracy = patterns.pattern_data.get("accuracy_rate", 0)
                mastery_data = patterns.pattern_data.get("topic_mastery", {})

                topic_mastery = mastery_data.get(topic, 0) if topic else 0

                performance_score = (accuracy * 0.7) + (topic_mastery * 0.3)

                if performance_score > 80:
                    query = query.filter_by(difficulty="ADVANCED")
                    query = query.union(
                        Content.query.filter_by(difficulty="INTERMEDIATE")
                        .order_by(func.random())
                        .limit(2)
                    )
                elif performance_score > 50:
                    query = query.filter_by(difficulty="INTERMEDIATE")
                    query = query.union(
                        Content.query.filter(
                            Content.difficulty.in_(["BEGINNER", "ADVANCED"])
                        )
                        .order_by(func.random())
                        .limit(3)
                    )
                else:
                    query = query.filter_by(difficulty="BEGINNER")
                    query = query.union(
                        Content.query.filter_by(difficulty="INTERMEDIATE")
                        .order_by(func.random())
                        .limit(1)
                    )

            query = query.order_by(func.random())
            return query.first()
        except Exception as e:
            logger.error(f"Error selecting content: {str(e)}")
            raise

    @staticmethod
    def _categorize_content_type(content):
        if not content:
            return "verbal"

        visual_keywords = {"diagram", "chart", "graph", "image", "picture", "visual"}
        interactive_keywords = {
            "simulation",
            "practice",
            "exercise",
            "interactive",
            "hands-on",
        }

        content_text = " ".join(
            [
                content.question or "",
                " ".join(content.keywords or []),
                content.clinical_scenario or "",
            ]
        ).lower()

        if any(keyword in content_text for keyword in visual_keywords):
            return "visual"
        if any(keyword in content_text for keyword in interactive_keywords):
            return "interactive"
        return "verbal"
