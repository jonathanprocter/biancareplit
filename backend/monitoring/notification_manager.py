
import logging
from datetime import datetime
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class NotificationManager:
    def __init__(self):
        self.notifications: List[Dict[str, Any]] = []
        self.thresholds = {
            'cpu': 80,  # 80% CPU usage
            'memory': 85,  # 85% memory usage
            'disk': 90,  # 90% disk usage
        }
    
    def check_thresholds(self, metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        alerts = []
        timestamp = datetime.now().isoformat()
        
        if metrics.get('cpu_percent', 0) > self.thresholds['cpu']:
            alerts.append({
                'type': 'warning',
                'component': 'cpu',
                'message': f"CPU usage exceeds threshold: {metrics['cpu_percent']}%",
                'timestamp': timestamp
            })
            
        if metrics.get('memory_usage', 0) > self.thresholds['memory']:
            alerts.append({
                'type': 'warning',
                'component': 'memory',
                'message': f"Memory usage exceeds threshold: {metrics['memory_usage']}%",
                'timestamp': timestamp
            })
            
        if metrics.get('disk_usage', 0) > self.thresholds['disk']:
            alerts.append({
                'type': 'warning',
                'component': 'disk',
                'message': f"Disk usage exceeds threshold: {metrics['disk_usage']}%",
                'timestamp': timestamp
            })
            
        return alerts
    
    def add_notification(self, notification: Dict[str, Any]):
        self.notifications.append(notification)
        if len(self.notifications) > 100:  # Keep last 100 notifications
            self.notifications.pop(0)
    
    def get_recent_notifications(self, limit: int = 10) -> List[Dict[str, Any]]:
        return self.notifications[-limit:]

notification_manager = NotificationManager()
