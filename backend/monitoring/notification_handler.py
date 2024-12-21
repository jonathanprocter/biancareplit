import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class NotificationHandler:
    def __init__(self):
        self.notification_queue = []
        self.alert_thresholds = {
            "cpu": 85.0,
            "memory": 80.0,
            "disk": 90.0,
            "error_rate": 5.0,
        }

    def check_threshold(self, metric_name: str, value: float) -> bool:
        return value > self.alert_thresholds.get(metric_name, 0)

    def create_notification(
        self, metric_name: str, value: float, severity: str = "warning"
    ) -> Dict[str, Any]:
        return {
            "metric": metric_name,
            "value": value,
            "severity": severity,
            "timestamp": datetime.now().isoformat(),
            "message": f"Alert: {metric_name} at {value}% exceeds threshold of {self.alert_thresholds.get(metric_name, 0)}%",
        }

    def process_metrics(self, metrics: Dict[str, float]) -> None:
        for metric_name, value in metrics.items():
            if self.check_threshold(metric_name, value):
                notification = self.create_notification(metric_name, value)
                self.notification_queue.append(notification)
                logger.warning(f"Alert triggered: {notification['message']}")
