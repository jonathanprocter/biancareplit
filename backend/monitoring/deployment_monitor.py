import logging
from datetime import datetime
from typing import Any, Dict

import psutil
from prometheus_client import Counter, Gauge

logger = logging.getLogger(__name__)

# Prometheus metrics
SYSTEM_METRICS = Gauge("system_metrics", "System metrics", ["type"])
DEPLOY_STATUS = Gauge("deployment_status", "Deployment status")
ERROR_COUNTER = Counter("deployment_errors", "Deployment errors", ["type"])


class DeploymentMonitor:
    def __init__(self):
        self.last_check = datetime.now()

    @staticmethod
    def get_system_metrics() -> Dict[str, Any]:
        """Collect system metrics"""
        try:
            metrics = {
                "cpu_usage": psutil.cpu_percent(),
                "memory_usage": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage("/").percent,
                "process_count": len(psutil.process_iter()),
            }

            # Update Prometheus metrics
            for metric_name, value in metrics.items():
                SYSTEM_METRICS.labels(type=metric_name).set(value)

            return metrics
        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")
            ERROR_COUNTER.labels(type="metrics_collection").inc()
            return {}

    def __init__(self):
        self.last_check = datetime.now()
        self.notification_handler = NotificationHandler()
        self.metric_aggregator = MetricAggregator()
        self.cleanup_service = MetricsCleanupService()
        self.logging_manager = LoggingManager()
        self.metrics_manager = MetricsManager()
        self.alert_manager = AlertManager()

    def check_system_health(self) -> Dict[str, Any]:
        """Check system health and generate alerts if needed"""
        metrics = self.metrics_manager.collect_and_store_metrics()
        alerts = self.alert_manager.check_metrics(metrics)

        if alerts:
            for alert in alerts:
                self.logging_manager.log_alert(alert)

        return {
            "status": "healthy" if not alerts else "warning",
            "metrics": metrics,
            "alerts": [
                {"message": a.message, "severity": a.severity.value} for a in alerts
            ],
        }

    def _record_metrics(self, metrics: Dict[str, float]):
        """Record metrics to aggregator"""
        for name, value in metrics.items():
            self.metric_aggregator.add_metric(name, value)

    def check_health(
        self,
    ) -> Dict[
        str, Any
    ]:  # This function remains largely unchanged, but the alert integration is handled in check_system_health
        """Check deployment health"""
        metrics = self.get_system_metrics()
        is_healthy = all(v < 90 for v in metrics.values())

        DEPLOY_STATUS.set(1 if is_healthy else 0)

        # Process metrics for notifications
        self.notification_handler.process_metrics(metrics)

        self._record_metrics(metrics)

        return {
            "status": "healthy" if is_healthy else "degraded",
            "timestamp": datetime.now().isoformat(),
            "metrics": metrics,
            "aggregates": {
                name: self.metric_aggregator.get_aggregate(name) for name in metrics
            },
            "uptime": self.get_uptime(),
            "alerts": self.notification_handler.notification_queue[-5:],
        }

    @staticmethod
    def get_uptime() -> float:
        """Get system uptime in seconds"""
        return psutil.boot_time()


# Placeholder classes -  replace with your actual implementations
class NotificationHandler:
    def __init__(self):
        self.notification_queue = []

    def process_metrics(self, metrics):
        pass


class MetricAggregator:
    def __init__(self):
        self.metrics = {}

    def add_metric(self, name, value):
        self.metrics[name] = value

    def get_aggregate(self, name):
        return self.metrics.get(name, 0)

    def add_metrics(self, metrics):
        self.metrics.update(metrics)


class MetricsCleanupService:
    pass


class LoggingManager:
    @staticmethod
    def log_alert(alert):
        print(f"Alert: {alert}")


class MetricsManager:
    @staticmethod
    def collect_and_store_metrics():
        return {"cpu": 50, "memory": 60, "disk": 70}


class AlertManager:
    @staticmethod
    def check_metrics(metrics):
        alerts = []
        if metrics["cpu"] > 80:
            alerts.append(Alert("High CPU usage", Severity.CRITICAL))
        if metrics["memory"] > 90:
            alerts.append(Alert("High Memory usage", Severity.CRITICAL))
        return alerts


class Alert:
    def __init__(self, message, severity):
        self.message = message
        self.severity = severity


class Severity:
    CRITICAL = 1
    WARNING = 2
