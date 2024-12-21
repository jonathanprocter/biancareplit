import logging
import psutil
from typing import Dict, Any
from prometheus_client import Gauge, Counter

logger = logging.getLogger(__name__)

# Prometheus metrics
INSTANCE_COUNT = Gauge("instance_count", "Number of running instances")
CPU_USAGE = Gauge("cpu_usage", "CPU usage percentage")
MEMORY_USAGE = Gauge("memory_usage", "Memory usage percentage")
SCALE_EVENTS = Counter("scale_events", "Scaling events", ["direction"])


class AutoscaleManager:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.current_instances = config.get("min_instances", 1)
        INSTANCE_COUNT.set(self.current_instances)

    def check_metrics(self) -> bool:
        """Check system metrics and determine if scaling is needed"""
        try:
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory().percent

            CPU_USAGE.set(cpu_percent)
            MEMORY_USAGE.set(memory)

            target_cpu = self.config.get("target_cpu_utilization", 80)

            if (
                cpu_percent > target_cpu
                and self.current_instances < self.config["max_instances"]
            ):
                self._scale_up()
                return True
            elif (
                cpu_percent < target_cpu / 2
                and self.current_instances > self.config["min_instances"]
            ):
                self._scale_down()
                return True

            return False
        except Exception as e:
            logger.error(f"Error checking metrics: {str(e)}")
            return False

    def _scale_up(self):
        """Scale up instances"""
        self.current_instances += self.config.get("scale_up_increment", 1)
        INSTANCE_COUNT.set(self.current_instances)
        SCALE_EVENTS.labels(direction="up").inc()
        logger.info(f"Scaled up to {self.current_instances} instances")

    def _scale_down(self):
        """Scale down instances"""
        self.current_instances -= self.config.get("scale_down_increment", 1)
        INSTANCE_COUNT.set(self.current_instances)
        SCALE_EVENTS.labels(direction="down").inc()
        logger.info(f"Scaled down to {self.current_instances} instances")
