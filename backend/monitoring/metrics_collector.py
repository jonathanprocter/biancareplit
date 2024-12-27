import logging
from datetime import datetime
from typing import Any, Dict

import psutil
from prometheus_client import Counter, Gauge, Histogram

logger = logging.getLogger(__name__)

# Prometheus metrics
CPU_USAGE = Gauge("system_cpu_usage", "Current CPU usage percentage")
MEMORY_USAGE = Gauge("system_memory_usage", "Current memory usage percentage")
DISK_USAGE = Gauge("system_disk_usage", "Current disk usage percentage")
REQUEST_LATENCY = Histogram("request_latency_seconds", "Request latency in seconds")
ERROR_COUNTER = Counter("error_total", "Total number of errors", ["type"])


class MetricsCollector:
    def __init__(self):
        self.start_time = datetime.utcnow()

    def collect_system_metrics(self) -> Dict[str, Any]:
        try:
            cpu = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage("/")

            metrics = {
                "cpu_usage": cpu,
                "memory_usage": memory.percent,
                "disk_usage": disk.percent,
                "timestamp": datetime.now().isoformat(),
            }

            # Update Prometheus metrics
            CPU_USAGE.set(cpu)
            MEMORY_USAGE.set(memory.percent)
            DISK_USAGE.set(disk.percent)

            return metrics
        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")
            ERROR_COUNTER.labels(type="metrics_collection").inc()
            return {}


metrics_collector = MetricsCollector()
