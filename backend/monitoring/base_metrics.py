"""Base metrics registry implementation with proper singleton pattern."""
from prometheus_client import CollectorRegistry, Counter, Histogram, Gauge
import logging
from typing import Optional, Dict, Any
from threading import Lock

logger = logging.getLogger(__name__)

class BaseMetricsRegistry:
    """Base singleton metrics registry with proper initialization controls."""
    
    _instance: Optional['BaseMetricsRegistry'] = None
    _initialized: bool = False
    _registry: Optional[CollectorRegistry] = None
    _metrics: Dict[str, Any] = {}
    _lock = Lock()

    def __new__(cls) -> 'BaseMetricsRegistry':
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
                    cls._instance._registry = None
                    cls._instance._metrics = {}
        return cls._instance

    def __init__(self):
        with self._lock:
            if not self._initialized:
                self._setup_registry()
                self._setup_default_metrics()
                self._initialized = True

    def _setup_registry(self) -> None:
        """Initialize a fresh registry with cleanup."""
        try:
            from .metrics_cleanup import cleanup_metrics
            
            # Clean existing metrics if we have a registry
            if self._registry:
                cleanup_metrics(self._registry)
                logger.info("Cleaned existing metrics registry")
            
            # Create fresh registry
            self._registry = CollectorRegistry()
            logger.info("Created fresh metrics registry")
            
        except Exception as e:
            logger.error(f"Error setting up metrics registry: {e}")
            raise

    def _setup_default_metrics(self) -> None:
        """Setup default metrics that should be available globally."""
        try:
            # HTTP metrics
            self._metrics['http_request_total'] = Counter(
                'http_requests_total',
                'Total number of HTTP requests',
                ['method', 'endpoint', 'status'],
                registry=self._registry
            )
            
            self._metrics['http_request_duration'] = Histogram(
                'http_request_duration_seconds',
                'HTTP request duration in seconds',
                ['method', 'endpoint'],
                registry=self._registry
            )
            
            # System metrics
            self._metrics['system_memory_usage'] = Gauge(
                'system_memory_bytes',
                'System memory usage in bytes',
                registry=self._registry
            )
            
            logger.info("Default metrics initialized successfully")
        except Exception as e:
            logger.error(f"Error setting up default metrics: {e}")
            raise

    @property
    def registry(self) -> CollectorRegistry:
        """Get the current registry."""
        if not self._registry:
            with self._lock:
                if not self._registry:
                    self._setup_registry()
        return self._registry

    def get_metric(self, name: str) -> Optional[Any]:
        """Get a metric by name."""
        return self._metrics.get(name)

    def is_initialized(self) -> bool:
        """Check if the registry is initialized."""
        return self._initialized

    def initialize(self) -> None:
        """Initialize the registry if not already initialized."""
        if not self._initialized:
            with self._lock:
                if not self._initialized:
                    self._setup_registry()
                    self._setup_default_metrics()
                    self._initialized = True

    def reset(self) -> None:
        """Reset the registry - primarily for testing."""
        with self._lock:
            self._initialized = False
            self._setup_registry()
            self._setup_default_metrics()
            logger.info("Metrics registry reset")

    def cleanup(self) -> None:
        """Clean up the current registry."""
        try:
            from .metrics_cleanup import cleanup_metrics
            with self._lock:
                if self._registry:
                    cleanup_metrics(self._registry)
                    logger.info("Registry cleaned up successfully")
        except Exception as e:
            logger.error(f"Error cleaning up registry: {e}")
            raise
