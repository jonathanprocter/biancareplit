import psutil
import logging
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    def __init__(self):
        self.metrics_history = []

    def collect_metrics(self) -> Dict[str, Any]:
        try:
            metrics = {
                "timestamp": datetime.now().isoformat(),
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage("/").percent,
            }
            self.metrics_history.append(metrics)
            return metrics
        except Exception as e:
            logger.error(f"Error collecting performance metrics: {str(e)}")
            return {}

    def get_metrics_history(self):
        return self.metrics_history[-100:] if self.metrics_history else []


performance_monitor = PerformanceMonitor()
import psutil
from typing import Dict, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    def __init__(self):
        self.metrics_history = []
        self.sampling_interval = 60  # seconds

    def collect_metrics(self) -> Dict[str, Any]:
        try:
            metrics = {
                "timestamp": datetime.now().isoformat(),
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory_usage": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage("/").percent,
                "process_count": len(psutil.process_iter()),
            }
            self.metrics_history.append(metrics)
            return metrics
        except Exception as e:
            logger.error(f"Error collecting performance metrics: {str(e)}")
            return {}

    def get_metrics_history(self, limit: int = 100) -> list:
        return self.metrics_history[-limit:] if self.metrics_history else []

    def get_system_health(self) -> Dict[str, Any]:
        metrics = self.collect_metrics()
        status = "healthy"

        # Check thresholds and generate notifications
        alerts = notification_manager.check_thresholds(metrics)
        if alerts:
            status = "warning"
            for alert in alerts:
                notification_manager.add_notification(alert)

        return {
            "status": status,
            "metrics": metrics,
            "alerts": alerts,
            "timestamp": datetime.now().isoformat(),
        }


performance_monitor = PerformanceMonitor()
