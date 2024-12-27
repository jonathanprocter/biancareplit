import logging
from datetime import datetime
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class NotificationSystem:
    def __init__(self):
        self.alert_thresholds = {
            "cpu_usage": 80.0,
            "memory_usage": 85.0,
            "disk_usage": 90.0,
            "response_time": 5.0,
        }
        self.notifications = []

    def check_metrics(self, metrics: Dict[str, float]) -> List[Dict[str, Any]]:
        alerts = []
        timestamp = datetime.now().isoformat()

        for metric_name, value in metrics.items():
            if (
                metric_name in self.alert_thresholds
                and value > self.alert_thresholds[metric_name]
            ):
                alert = {
                    "type": "system_alert",
                    "metric": metric_name,
                    "value": value,
                    "threshold": self.alert_thresholds[metric_name],
                    "timestamp": timestamp,
                    "severity": (
                        "critical"
                        if value > self.alert_thresholds[metric_name] * 1.2
                        else "warning"
                    ),
                }
                alerts.append(alert)
                self.notifications.append(alert)
                logger.warning(f"Alert triggered: {metric_name} at {value}")

        return alerts

    def get_recent_alerts(self, limit: int = 10) -> List[Dict[str, Any]]:
        return self.notifications[-limit:]


notification_system = NotificationSystem()
