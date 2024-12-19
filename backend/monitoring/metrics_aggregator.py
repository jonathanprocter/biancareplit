
import time
from typing import Dict, Any
import psutil
from datetime import datetime

class MetricsAggregator:
    def __init__(self):
        self._metrics_buffer = []
        self._buffer_size = 100

    def collect_system_metrics(self) -> Dict[str, Any]:
        """Collect current system metrics"""
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'cpu_usage': psutil.cpu_percent(),
            'memory_usage': psutil.virtual_memory().percent,
            'disk_usage': psutil.disk_usage('/').percent,
            'load_average': psutil.getloadavg()[0]
        }

    def add_request_metrics(self, path: str, method: str, duration: float):
        """Add request-specific metrics"""
        metric = {
            'timestamp': datetime.utcnow().isoformat(),
            'path': path,
            'method': method,
            'duration': duration,
            'type': 'request'
        }
        self._metrics_buffer.append(metric)
        if len(self._metrics_buffer) > self._buffer_size:
            self._metrics_buffer.pop(0)

metrics_aggregator = MetricsAggregator()
