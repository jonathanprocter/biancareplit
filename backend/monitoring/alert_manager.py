import logging
from typing import Dict, Any, Optional
from datetime import datetime
import psutil

logger = logging.getLogger(__name__)


class AlertManager:
    def __init__(self, thresholds: Dict[str, float] = None):
        self.thresholds = thresholds or {
            "cpu_percent": 80.0,
            "memory_percent": 85.0,
            "disk_usage_percent": 90.0,
            "response_time": 2.0,  # seconds
        }
        self.alerts = []

    def check_system_health(self) -> Dict[str, Any]:
        try:
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage("/")

            status = {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "disk_usage_percent": disk.percent,
                "timestamp": datetime.now().isoformat(),
            }

            self._evaluate_alerts(status)
            return status
        except Exception as e:
            logger.error(f"Error checking system health: {str(e)}")
            return {}

    def _evaluate_alerts(self, status: Dict[str, float]) -> None:
        if status.get("cpu_percent", 0) > self.thresholds["cpu_percent"]:
            self._create_alert(
                "HIGH_CPU_USAGE", f"CPU usage at {status['cpu_percent']}%"
            )

        if status.get("memory_percent", 0) > self.thresholds["memory_percent"]:
            self._create_alert(
                "HIGH_MEMORY_USAGE", f"Memory usage at {status['memory_percent']}%"
            )

        if status.get("disk_usage_percent", 0) > self.thresholds["disk_usage_percent"]:
            self._create_alert(
                "HIGH_DISK_USAGE", f"Disk usage at {status['disk_usage_percent']}%"
            )

    def _create_alert(self, alert_type: str, message: str) -> None:
        alert = {
            "type": alert_type,
            "message": message,
            "timestamp": datetime.now().isoformat(),
        }
        self.alerts.append(alert)
        logger.warning(f"Alert created: {alert}")

    def get_recent_alerts(self, limit: int = 10) -> list:
        return self.alerts[-limit:] if self.alerts else []


alert_manager = AlertManager()
