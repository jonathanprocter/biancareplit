import psutil
import logging
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)


class MetricsManager:
    def __init__(self):
        self.alerts = []

    def collect_and_store_metrics(self) -> Dict[str, Any]:
        try:
            metrics = {
                "timestamp": datetime.utcnow().isoformat(),
                "system": {
                    "cpu_usage": psutil.cpu_percent(),
                    "memory": psutil.virtual_memory()._asdict(),
                    "disk": psutil.disk_usage("/")._asdict(),
                },
            }
            self._check_alerts(metrics)
            return metrics
        except Exception as e:
            logger.error(f"Error collecting metrics: {str(e)}")
            return {"error": str(e)}

    def _check_alerts(self, metrics: Dict[str, Any]) -> None:
        if metrics["system"]["cpu_usage"] > 80:
            self.alerts.append(
                {
                    "type": "high_cpu",
                    "message": f"High CPU usage: {metrics['system']['cpu_usage']}%",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

    def get_recent_alerts(self, limit: int = 10) -> list:
        return self.alerts[-limit:]


metrics_manager = MetricsManager()
