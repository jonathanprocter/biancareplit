
import psutil
import time
import logging
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)

class MetricsCollector:
    def __init__(self):
        self.start_time = datetime.utcnow()

    def collect_metrics(self) -> Dict[str, Any]:
        try:
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'uptime_seconds': (datetime.utcnow() - self.start_time).total_seconds(),
                'system': {
                    'cpu': psutil.cpu_percent(interval=1),
                    'memory': psutil.virtual_memory()._asdict(),
                    'disk': psutil.disk_usage('/')._asdict()
                }
            }
        except Exception as e:
            logger.error(f"Failed to collect metrics: {str(e)}")
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

metrics_collector = MetricsCollector()
