"""Cleanup tool for Prometheus metrics to prevent duplicates."""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Set

from prometheus_client import REGISTRY, CollectorRegistry

logger = logging.getLogger(__name__)


def cleanup_metrics(registry: Optional[CollectorRegistry] = None) -> Set[str]:
    """Clean up existing Prometheus metrics to prevent duplicates.

    Args:
        registry: Optional specific registry to clean. If None, cleans default REGISTRY.

    Returns:
        Set of cleaned metric names
    """
    target_registry = registry or REGISTRY
    cleaned_metrics = set()

    try:
        if hasattr(target_registry, "_collector_to_names"):
            collectors = list(target_registry._collector_to_names.keys())

            # Clean up each collector
            for collector in collectors:
                try:
                    metric_names = target_registry._collector_to_names.get(
                        collector, set()
                    )
                    target_registry.unregister(collector)
                    cleaned_metrics.update(metric_names)
                    logger.debug(f"Cleaned up metrics: {metric_names}")
                except KeyError:
                    # Skip if already unregistered
                    continue
                except Exception as e:
                    logger.warning(f"Error unregistering collector {collector}: {e}")
                    continue

            logger.info(
                f"Successfully cleaned {len(cleaned_metrics)} metrics from registry"
            )
        else:
            logger.warning("Registry does not have _collector_to_names attribute")

        return cleaned_metrics
    except Exception as e:
        logger.error(f"Error during metrics cleanup: {str(e)}")
        raise


logger = logging.getLogger(__name__)


class MetricsCleanupService:
    def __init__(self, retention_days: int = 30):
        self.retention_days = retention_days
        self.last_cleanup = datetime.now()

    def cleanup_metrics(self, metrics_store: Dict[str, Any]) -> None:
        """Clean up old metrics based on retention policy"""
        try:
            cutoff = datetime.now() - timedelta(days=self.retention_days)
            cleaned = 0

            for metric_type in list(metrics_store.keys()):
                if isinstance(metrics_store[metric_type], list):
                    original_len = len(metrics_store[metric_type])
                    metrics_store[metric_type] = [
                        m
                        for m in metrics_store[metric_type]
                        if m.get("timestamp", datetime.now()) > cutoff
                    ]
                    cleaned += original_len - len(metrics_store[metric_type])

            logger.info(f"Cleaned {cleaned} old metrics records")
            self.last_cleanup = datetime.now()
        except Exception as e:
            logger.error(f"Error during metrics cleanup: {str(e)}")
