
import psutil
import time
import logging
from datetime import datetime
from typing import Dict, Any
from collections import deque

logger = logging.getLogger(__name__)

class MetricsCollector:
    def __init__(self, history_size: int = 100):
        self.start_time = datetime.utcnow()
        self.metrics_history = deque(maxlen=history_size)
        self.warning_thresholds = {
            'cpu': 70,
            'memory': 75,
            'disk': 75
        }
        self.critical_thresholds = {
            'cpu': 85,
            'memory': 85,
            'disk': 85
        }

    def collect_metrics(self) -> Dict[str, Any]:
        try:
            metrics = {
                'timestamp': datetime.utcnow().isoformat(),
                'uptime_seconds': (datetime.utcnow() - self.start_time).total_seconds(),
                'system': {
                    'cpu': psutil.cpu_percent(interval=1),
                    'memory': psutil.virtual_memory()._asdict(),
                    'disk': psutil.disk_usage('/')._asdict(),
                    'network': psutil.net_io_counters()._asdict()
                }
            }

            # Add status indicators
            metrics['status'] = self._calculate_status(metrics)

            # Store in history
            self.metrics_history.append(metrics)

            return metrics
        except Exception as e:
            logger.error(f"Failed to collect metrics: {str(e)}")
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat(),
                'status': 'error'
            }

    def _calculate_status(self, metrics: Dict) -> str:
        cpu = metrics['system']['cpu']
        memory = metrics['system']['memory']['percent']
        disk = metrics['system']['disk']['percent']

        if (cpu >= self.critical_thresholds['cpu'] or
            memory >= self.critical_thresholds['memory'] or
            disk >= self.critical_thresholds['disk']):
            return 'critical'
        if (cpu >= self.warning_thresholds['cpu'] or
              memory >= self.warning_thresholds['memory'] or
              disk >= self.warning_thresholds['disk']):
            return 'warning'
        return 'healthy'

    def get_metrics_history(self) -> list:
        return list(self.metrics_history)

metrics_collector = MetricsCollector()
