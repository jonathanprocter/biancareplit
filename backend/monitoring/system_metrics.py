
import psutil
import time
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class SystemMetricsCollector:
    def __init__(self, collection_interval: int = 60):
        self.collection_interval = collection_interval
        self.last_collection = 0
        
    def collect_metrics(self) -> Dict[str, Any]:
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'timestamp': int(time.time()),
                'cpu_percent': cpu_percent,
                'memory_usage': memory.percent,
                'disk_usage': disk.percent,
                'memory_available': memory.available,
                'disk_available': disk.free
            }
        except Exception as e:
            logger.error(f"Error collecting system metrics: {str(e)}")
            return {}

metrics_collector = SystemMetricsCollector()
