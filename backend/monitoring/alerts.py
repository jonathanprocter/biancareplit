
import logging
from typing import Dict, Any
from datetime import datetime
from prometheus_client import Counter, Gauge

logger = logging.getLogger(__name__)

ALERT_COUNTER = Counter('deployment_alerts', 'Deployment alerts triggered', ['severity', 'type'])
ALERT_STATUS = Gauge('alert_status', 'Current alert status', ['type'])

class AlertManager:
    def __init__(self):
        self.thresholds = {
            'cpu': 90.0,
            'memory': 85.0,
            'disk': 85.0,
            'error_rate': 5.0
        }
        
    def check_metrics(self, metrics: Dict[str, Any]) -> Dict[str, bool]:
        alerts = {}
        for metric, value in metrics.items():
            if metric in self.thresholds and value > self.thresholds[metric]:
                alerts[metric] = True
                ALERT_COUNTER.labels(severity='warning', type=metric).inc()
                ALERT_STATUS.labels(type=metric).set(1)
                logger.warning(f"Alert triggered for {metric}: {value}%")
            else:
                ALERT_STATUS.labels(type=metric).set(0)
        return alerts
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

@dataclass
class Alert:
    message: str
    severity: AlertSeverity
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None
    resolved: bool = False

class AlertManager:
    def __init__(self):
        self.alerts: List[Alert] = []
        self.thresholds = {
            'cpu_percent': 80.0,
            'memory_percent': 85.0,
            'disk_usage_percent': 90.0
        }
        
    def check_metrics(self, metrics: Dict[str, Any]) -> List[Alert]:
        """Check metrics against thresholds and generate alerts"""
        new_alerts = []
        
        if metrics.get('cpu_percent', 0) > self.thresholds['cpu_percent']:
            new_alerts.append(Alert(
                message=f"High CPU usage: {metrics['cpu_percent']}%",
                severity=AlertSeverity.WARNING,
                timestamp=datetime.now()
            ))
            
        if metrics.get('memory_percent', 0) > self.thresholds['memory_percent']:
            new_alerts.append(Alert(
                message=f"High memory usage: {metrics['memory_percent']}%",
                severity=AlertSeverity.WARNING,
                timestamp=datetime.now()
            ))
            
        if metrics.get('disk_usage_percent', 0) > self.thresholds['disk_usage_percent']:
            new_alerts.append(Alert(
                message=f"High disk usage: {metrics['disk_usage_percent']}%",
                severity=AlertSeverity.CRITICAL,
                timestamp=datetime.now()
            ))
            
        self.alerts.extend(new_alerts)
        return new_alerts
        
    def get_active_alerts(self) -> List[Alert]:
        """Get all unresolved alerts"""
        return [alert for alert in self.alerts if not alert.resolved]
        
    def resolve_alert(self, index: int) -> bool:
        """Mark an alert as resolved"""
        if 0 <= index < len(self.alerts):
            self.alerts[index].resolved = True
            return True
        return False
import logging
from typing import Dict, Any
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class Alert:
    type: str
    message: str
    severity: str
    timestamp: datetime
    metrics: Dict[str, Any]

class AlertManager:
    def __init__(self):
        self.cpu_threshold = 80
        self.memory_threshold = 85
        self.disk_threshold = 90
        
    def check_system_metrics(self, metrics: Dict[str, Any]) -> Alert | None:
        """Check system metrics and generate alerts if thresholds are exceeded"""
        try:
            if metrics['cpu_usage'] > self.cpu_threshold:
                return Alert(
                    type='cpu_warning',
                    message=f'CPU usage is high: {metrics["cpu_usage"]}%',
                    severity='warning',
                    timestamp=datetime.now(),
                    metrics=metrics
                )
                
            if metrics['memory_usage'] > self.memory_threshold:
                return Alert(
                    type='memory_warning',
                    message=f'Memory usage is high: {metrics["memory_usage"]}%',
                    severity='warning',
                    timestamp=datetime.now(),
                    metrics=metrics
                )
                
            if metrics['disk_usage'] > self.disk_threshold:
                return Alert(
                    type='disk_warning',
                    message=f'Disk usage is high: {metrics["disk_usage"]}%',
                    severity='warning',
                    timestamp=datetime.now(),
                    metrics=metrics
                )
                
            return None
        except Exception as e:
            logger.error(f"Error checking metrics: {e}")
            return None

alert_manager = AlertManager()
