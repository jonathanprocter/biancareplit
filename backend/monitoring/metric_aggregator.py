
import logging
from typing import Dict, Any
from collections import defaultdict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class MetricAggregator:
    def __init__(self, retention_period: int = 24):
        self.metrics = defaultdict(list)
        self.retention_period = retention_period
        self.last_cleanup = datetime.now()

    def add_metric(self, name: str, value: float, tags: Dict[str, str] = None):
        """Add a metric with optional tags"""
        self.metrics[name].append({
            'value': value,
            'timestamp': datetime.now(),
            'tags': tags or {}
        })
        self._cleanup_old_metrics()

    def get_aggregate(self, name: str, window: int = 60) -> Dict[str, Any]:
        """Get aggregated metrics for the specified window in minutes"""
        cutoff = datetime.now() - timedelta(minutes=window)
        recent_metrics = [m for m in self.metrics[name] 
                        if m['timestamp'] > cutoff]
        
        if not recent_metrics:
            return {'count': 0, 'avg': 0, 'min': 0, 'max': 0}
            
        values = [m['value'] for m in recent_metrics]
        return {
            'count': len(values),
            'avg': sum(values) / len(values),
            'min': min(values),
            'max': max(values)
        }

    def _cleanup_old_metrics(self):
        """Remove metrics older than retention period"""
        if (datetime.now() - self.last_cleanup) < timedelta(hours=1):
            return
            
        cutoff = datetime.now() - timedelta(hours=self.retention_period)
        for metric_name in self.metrics:
            self.metrics[metric_name] = [
                m for m in self.metrics[metric_name]
                if m['timestamp'] > cutoff
            ]
        self.last_cleanup = datetime.now()
