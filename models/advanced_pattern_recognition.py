from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import numpy as np
import tensorflow as tf
from datetime import datetime
from extensions import db
from sqlalchemy.dialects.postgresql import JSON


class AdvancedPatternModel(db.Model):
    __tablename__ = "advanced_patterns"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    pattern_type = db.Column(
        db.String(50), nullable=False
    )  # 'response', 'temporal', 'behavioral', 'cognitive'
    pattern_data = db.Column(JSON, nullable=False)
    model_state = db.Column(JSON, nullable=True)  # Store model parameters
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def store_pattern(
        user_id: int, pattern_type: str, pattern_data: dict, model_state: dict = None
    ):
        pattern = AdvancedPatternModel(
            user_id=user_id,
            pattern_type=pattern_type,
            pattern_data=pattern_data,
            model_state=model_state,
        )
        db.session.add(pattern)
        db.session.commit()
        return pattern


class AdvancedPatternRecognition:
    def __init__(self):
        self.response_analyzer = MLPClassifier(
            hidden_layer_sizes=(100, 50), activation="relu", solver="adam"
        )

        self.temporal_analyzer = GradientBoostingRegressor(
            n_estimators=100, learning_rate=0.1, max_depth=3
        )

        self.behavior_classifier = RandomForestClassifier(
            n_estimators=100, max_depth=None, min_samples_split=2
        )

        self.deep_pattern_model = self._build_deep_pattern_model()
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=0.95)  # Preserve 95% of variance

    def _build_deep_pattern_model(self):
        model = tf.keras.Sequential(
            [
                tf.keras.layers.Dense(128, activation="relu", input_shape=(50,)),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(64, activation="relu"),
                tf.keras.layers.Dropout(0.2),
                tf.keras.layers.Dense(32, activation="relu"),
                tf.keras.layers.Dense(16, activation="relu"),
                tf.keras.layers.Dense(8, activation="softmax"),
            ]
        )

        model.compile(
            optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"]
        )

        return model

    def analyze_learning_patterns(self, user_data: dict):
        """Comprehensive analysis of learning patterns using multiple models"""
        temporal_features = self._extract_temporal_features(user_data)
        behavioral_features = self._extract_behavioral_features(user_data)
        cognitive_features = self._extract_cognitive_features(user_data)

        # Scale and transform features
        scaled_features = self.scaler.fit_transform(
            np.concatenate(
                [temporal_features, behavioral_features, cognitive_features], axis=1
            )
        )
        transformed_features = self.pca.fit_transform(scaled_features)

        # Generate predictions from each model
        pattern_analysis = {
            "temporal_patterns": self._analyze_temporal_patterns(temporal_features),
            "behavioral_patterns": self._analyze_behavioral_patterns(
                behavioral_features
            ),
            "cognitive_patterns": self._analyze_cognitive_patterns(cognitive_features),
            "deep_patterns": self._analyze_deep_patterns(transformed_features),
        }

        return pattern_analysis

    def _extract_temporal_features(self, user_data):
        """Extract time-based learning patterns"""
        features = []
        for session in user_data.get("sessions", []):
            time_features = [
                session.get("duration", 0),
                session.get("average_response_time", 0),
                session.get("time_variance", 0),
                session.get("completion_rate", 0),
            ]
            features.append(time_features)
        return np.array(features)

    def _extract_behavioral_features(self, user_data):
        """Extract behavioral patterns from user interactions"""
        features = []
        for session in user_data.get("sessions", []):
            behavioral_features = [
                session.get("confidence_level", 0),
                session.get("answer_changes", 0),
                session.get("review_frequency", 0),
                session.get("engagement_score", 0),
            ]
            features.append(behavioral_features)
        return np.array(features)

    def _extract_cognitive_features(self, user_data):
        """Extract cognitive learning patterns"""
        features = []
        for session in user_data.get("sessions", []):
            cognitive_features = [
                session.get("comprehension_score", 0),
                session.get("retention_rate", 0),
                session.get("error_pattern_score", 0),
                session.get("mastery_level", 0),
            ]
            features.append(cognitive_features)
        return np.array(features)

    def _analyze_temporal_patterns(self, features):
        """Analyze temporal learning patterns"""
        predictions = self.temporal_analyzer.predict(features)
        return {
            "learning_pace": float(np.mean(predictions)),
            "consistency_score": float(np.std(predictions)),
            "trend": self._calculate_trend(predictions),
        }

    def _analyze_behavioral_patterns(self, features):
        """Analyze behavioral patterns"""
        predictions = self.behavior_classifier.predict_proba(features)
        return {
            "learning_style": self._identify_learning_style(predictions),
            "confidence_level": float(np.mean(predictions[:, 1])),
            "engagement_pattern": self._identify_engagement_pattern(features),
        }

    def _analyze_cognitive_patterns(self, features):
        """Analyze cognitive learning patterns"""
        processed_features = self.scaler.fit_transform(features)
        scores = self.deep_pattern_model.predict(processed_features)
        return {
            "comprehension_level": float(np.mean(scores)),
            "retention_pattern": self._analyze_retention(scores),
            "mastery_progression": self._calculate_mastery_progression(scores),
        }

    def _analyze_deep_patterns(self, features):
        """Analyze complex patterns using deep learning"""
        predictions = self.deep_pattern_model.predict(features)
        return {
            "complex_patterns": self._interpret_deep_patterns(predictions),
            "learning_trajectory": self._calculate_trajectory(predictions),
            "recommended_adjustments": self._generate_recommendations(predictions),
        }

    def _calculate_trend(self, data):
        """Calculate learning trend from time series data"""
        x = np.arange(len(data))
        z = np.polyfit(x, data, 1)
        return float(z[0])

    def _identify_learning_style(self, predictions):
        """Identify dominant learning style from behavioral patterns"""
        styles = ["visual", "auditory", "kinesthetic", "reading/writing"]
        return styles[np.argmax(np.mean(predictions, axis=0))]

    def _identify_engagement_pattern(self, features):
        """Identify engagement patterns from behavioral data"""
        patterns = ["consistent", "sporadic", "declining", "improving"]
        trend = self._calculate_trend(features[:, -1])
        return patterns[int(np.clip(trend * 2 + 1, 0, 3))]

    def _analyze_retention(self, scores):
        """Analyze knowledge retention patterns"""
        retention_rate = np.mean(scores)
        decay_rate = -np.log(retention_rate) if retention_rate > 0 else 0
        return {
            "retention_rate": float(retention_rate),
            "decay_rate": float(decay_rate),
            "stability_score": float(1 / (1 + decay_rate)),
        }

    def _calculate_mastery_progression(self, scores):
        """Calculate mastery progression over time"""
        return {
            "current_level": float(np.mean(scores)),
            "progress_rate": float(self._calculate_trend(scores)),
            "mastery_stability": float(1 - np.std(scores)),
        }

    def _interpret_deep_patterns(self, predictions):
        """Interpret complex patterns from deep learning model"""
        return {
            "pattern_strength": float(np.max(predictions)),
            "pattern_stability": float(1 - np.std(predictions)),
            "pattern_complexity": float(np.sum(predictions > 0.5)),
        }

    def _calculate_trajectory(self, predictions):
        """Calculate learning trajectory from deep patterns"""
        return {
            "direction": float(self._calculate_trend(predictions)),
            "acceleration": float(np.diff(predictions).mean()),
            "stability": float(1 - np.std(predictions)),
        }

    def _generate_recommendations(self, predictions):
        """Generate learning recommendations based on deep patterns"""
        trajectory = self._calculate_trajectory(predictions)
        return {
            "difficulty_adjustment": float(trajectory["direction"] * 0.5),
            "focus_areas": self._identify_focus_areas(predictions),
            "learning_pace": self._recommend_pace(trajectory),
        }

    def _identify_focus_areas(self, predictions):
        """Identify areas needing focus based on pattern analysis"""
        areas = ["comprehension", "retention", "application", "analysis"]
        scores = predictions.mean(axis=0)
        return [area for area, score in zip(areas, scores) if score < 0.7]

    def _recommend_pace(self, trajectory):
        """Recommend learning pace based on trajectory analysis"""
        if trajectory["direction"] > 0.5:
            return "accelerate"
        elif trajectory["direction"] < -0.2:
            return "consolidate"
        else:
            return "maintain"
