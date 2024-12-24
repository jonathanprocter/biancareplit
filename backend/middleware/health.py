"""Health check middleware implementation."""

import psutil
import logging
from typing import Dict, Any, Optional, List, Union, TypedDict
from flask import Flask, jsonify, make_response
from datetime import datetime
from .base import BaseMiddleware
from ..config.unified_config import config_manager
from ..database.core import db_manager

logger = logging.getLogger(__name__)

class MemoryMetrics(TypedDict):
    process_used_mb: float
    process_percent: float
    system_total_gb: float
    system_available_gb: float
    system_percent: float

class CPUMetrics(TypedDict):
    process_percent: float
    system_percent: float
    cores_physical: int
    cores_logical: int

class HealthMiddleware(BaseMiddleware):
    """Handles application health monitoring with comprehensive system checks."""

    def __init__(self, app: Optional[Flask] = None):
        """Initialize health check middleware with proper error handling."""
        self.start_time = datetime.now()
        self._setup_logging()
        self._last_check: Dict[str, Any] = {}
        self._check_interval = 60  # Cache health check results for 60 seconds
        super().__init__(app)

    def _setup_logging(self) -> None:
        """Set up health check specific logging with proper formatting."""
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

    def init_app(self, app: Flask) -> None:
        """Initialize health check endpoints with proper configuration."""
        try:
            super().init_app(app)
            config = config_manager.get("MIDDLEWARE", {}).get("health", {})
            endpoint = config.get("endpoint", "/health")
            enabled = config.get("enabled", True)
            detailed = config.get("detailed", True)

            if not enabled:
                logger.info("Health check middleware is disabled by configuration")
                return

            @app.route(endpoint)
            def health_check():
                """Comprehensive health check endpoint."""
                try:
                    current_time = datetime.now()
                    if (
                        not self._last_check or 
                        (current_time - self._last_check.get("timestamp", datetime.min)).total_seconds() > self._check_interval
                    ):
                        health_data = self._perform_health_check(app, detailed)
                        health_data["timestamp"] = current_time.isoformat()
                        self._last_check = health_data

                    status_code = 200 if self._last_check.get("status") == "healthy" else 503
                    response = make_response(jsonify(self._last_check), status_code)
                    response.headers["Content-Type"] = "application/json"
                    return response

                except Exception as e:
                    logger.error(f"Health check failed: {str(e)}")
                    if app.debug:
                        logger.exception("Detailed health check error:")
                    return jsonify({
                        "status": "error",
                        "error": str(e),
                        "timestamp": datetime.now().isoformat()
                    }), 503

        except Exception as e:
            logger.error(f"Failed to initialize health check middleware: {str(e)}")
            if app.debug:
                logger.exception("Detailed initialization error:")
            raise

    def _perform_health_check(self, app: Flask, detailed: bool = True) -> Dict[str, Any]:
        """Perform comprehensive system health check."""
        try:
            health_data = {
                "status": "healthy",
                "uptime": str(datetime.now() - self.start_time),
                "system": self._get_system_health(),
                "database": self._check_database_health(app),
                "environment": app.config.get("ENV", "production"),
                "debug_mode": app.debug
            }

            # Add detailed metrics if enabled
            if detailed:
                health_data.update({
                    "memory_detailed": self._get_detailed_memory_info(),
                    "disk": self._get_disk_usage(),
                    "network": self._get_network_info()
                })

            # Determine overall health status
            if not health_data["database"]["connected"]:
                health_data["status"] = "unhealthy"
            elif health_data["system"]["memory"]["system_percent"] > 90:
                health_data["status"] = "warning"

            return health_data
        except Exception as e:
            logger.error(f"Error performing health check: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    def _get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health metrics with error handling."""
        return {
            "cpu": self._get_cpu_usage(),
            "memory": self._get_memory_usage(),
            "load_average": self._get_load_average()
        }

    def _get_memory_usage(self) -> Union[MemoryMetrics, Dict[str, str]]:
        """Get detailed memory usage metrics."""
        try:
            process = psutil.Process()
            virtual_memory = psutil.virtual_memory()
            return {
                "process_used_mb": round(process.memory_info().rss / 1024 / 1024, 2),
                "process_percent": round(process.memory_percent(), 2),
                "system_total_gb": round(virtual_memory.total / (1024 ** 3), 2),
                "system_available_gb": round(virtual_memory.available / (1024 ** 3), 2),
                "system_percent": virtual_memory.percent
            }
        except Exception as e:
            logger.error(f"Error getting memory usage: {str(e)}")
            return {"error": str(e)}

    def _get_cpu_usage(self) -> Union[CPUMetrics, Dict[str, str]]:
        """Get detailed CPU usage metrics."""
        try:
            return {
                "process_percent": round(psutil.Process().cpu_percent(interval=0.1), 2),
                "system_percent": round(psutil.cpu_percent(interval=0.1), 2),
                "cores_physical": psutil.cpu_count(logical=False),
                "cores_logical": psutil.cpu_count(logical=True)
            }
        except Exception as e:
            logger.error(f"Error getting CPU usage: {str(e)}")
            return {"error": str(e)}

    def _get_load_average(self) -> List[float]:
        """Get system load average with proper error handling."""
        try:
            return [round(x, 2) for x in psutil.getloadavg()]
        except Exception as e:
            logger.error(f"Error getting load average: {str(e)}")
            return [-1.0, -1.0, -1.0]

    def _get_detailed_memory_info(self) -> Dict[str, Any]:
        """Get comprehensive memory information."""
        try:
            virtual_memory = psutil.virtual_memory()
            swap_memory = psutil.swap_memory()
            return {
                "virtual_memory": {
                    "total": virtual_memory.total,
                    "available": virtual_memory.available,
                    "percent": virtual_memory.percent,
                    "used": virtual_memory.used,
                    "free": virtual_memory.free
                },
                "swap_memory": {
                    "total": swap_memory.total,
                    "used": swap_memory.used,
                    "free": swap_memory.free,
                    "percent": swap_memory.percent
                }
            }
        except Exception as e:
            logger.error(f"Error getting detailed memory info: {str(e)}")
            return {"error": str(e)}

    def _get_disk_usage(self) -> Dict[str, Any]:
        """Get comprehensive disk usage information."""
        try:
            disk = psutil.disk_usage('/')
            io_counters = psutil.disk_io_counters()
            return {
                "usage": {
                    "total_gb": round(disk.total / (1024 ** 3), 2),
                    "used_gb": round(disk.used / (1024 ** 3), 2),
                    "free_gb": round(disk.free / (1024 ** 3), 2),
                    "percent": disk.percent
                },
                "io": {
                    "read_bytes": io_counters.read_bytes if io_counters else 0,
                    "write_bytes": io_counters.write_bytes if io_counters else 0,
                    "read_count": io_counters.read_count if io_counters else 0,
                    "write_count": io_counters.write_count if io_counters else 0
                }
            }
        except Exception as e:
            logger.error(f"Error getting disk usage: {str(e)}")
            return {"error": str(e)}

    def _get_network_info(self) -> Dict[str, Any]:
        """Get detailed network interface information."""
        try:
            net_io = psutil.net_io_counters()
            return {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv,
                "error_in": net_io.errin,
                "error_out": net_io.errout,
                "drop_in": net_io.dropin,
                "drop_out": net_io.dropout
            }
        except Exception as e:
            logger.error(f"Error getting network info: {str(e)}")
            return {"error": str(e)}

    def _check_database_health(self, app: Flask) -> Dict[str, Any]:
        """Check database connection health with comprehensive diagnostics."""
        try:
            with app.app_context():
                is_connected = db_manager.verify_connection(app)
                connection_info = db_manager.get_connection_info(app)

                health_status = {
                    "connected": is_connected,
                    "connection_info": connection_info
                }

                if not is_connected:
                    logger.error("Database connection check failed")
                    health_status["error"] = "Database connection verification failed"

                return health_status

        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            if app.debug:
                logger.exception("Detailed database error:")
            return {
                "connected": False,
                "error": str(e)
            }