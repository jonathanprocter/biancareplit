
from typing import Dict, List, Any, Callable
import logging

logger = logging.getLogger(__name__)

class MetricsRegistry:
    def __init__(self):
        self.collectors: Dict[str, Callable] = {}
        self.metrics_history: List[Dict[str, Any]] = []
        self.max_history_size = 1000

    def register_collector(self, name: str, collector: Callable):
        self.collectors[name] = collector
        
    def collect_all(self) -> Dict[str, Any]:
        metrics = {}
        for name, collector in self.collectors.items():
            try:
                metrics[name] = collector()
            except Exception as e:
                logger.error(f"Error collecting {name} metrics: {str(e)}")
                metrics[name] = {}
        
        if len(self.metrics_history) >= self.max_history_size:
            self.metrics_history.pop(0)
        self.metrics_history.append(metrics)
        return metrics

metrics_registry = MetricsRegistry()
