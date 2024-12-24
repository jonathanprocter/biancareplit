"""Health check middleware implementation."""

import psutil
import logging
from typing import Dict, Any, Optional, List
from flask import Flask, jsonify, make_response
from datetime import datetime
from .base import BaseMiddleware
from ..config.unified_config import config_manager
from ..database.core import db_manager

logger = logging.getLogger(__name__)

class HealthMiddleware(BaseMiddleware):
    """Handles application health monitoring."""

    def __init__(self, app: Optional[Flask] = None):
        super().__init__(app)
        if app is not None:
            self.init_app(app)
        self.start_time = datetime.now()
        self._setup_logging()

    def _setup_logging(self) -> None:
        """Set up health check specific logging."""
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

    def init_app(self, app: Flask) -> None:
        """Initialize health check endpoints."""
        config = config_manager.get("MIDDLEWARE", {}).get("health", {})
        endpoint = config.get("endpoint", "/health")
        enabled = config.get("enabled", True)
        detailed = config.get("detailed", True)

        if not enabled:
            logger.info("Health check middleware is disabled")
            return

        @app.route(endpoint)
        def health_check():
            try:
                health_data = {
                    "status": "ok",
                    "timestamp": datetime.now().isoformat(),
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

                response = make_response(jsonify(health_data), 200)
                response.headers["Content-Type"] = "application/json"
                return response

            except Exception as e:
                logger.error(f"Health check failed: {str(e)}")
                return jsonify({
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }), 500

    def _get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health metrics."""
        try:
            return {
                "cpu": self._get_cpu_usage(),
                "memory": self._get_memory_usage(),
                "load_average": self._get_load_average()
            }
        except Exception as e:
            logger.error(f"Error getting system health: {str(e)}")
            return {"error": str(e)}

    def _get_memory_usage(self) -> Dict[str, float]:
        """Get current memory usage."""
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

    def _get_detailed_memory_info(self) -> Dict[str, Any]:
        """Get detailed memory information."""
        try:
            process = psutil.Process()
            memory_maps = process.memory_maps()
            return {
                "virtual_memory": dict(psutil.virtual_memory()._asdict()),
                "swap_memory": dict(psutil.swap_memory()._asdict()),
                "process_memory_maps": len(memory_maps)
            }
        except Exception as e:
            logger.error(f"Error getting detailed memory info: {str(e)}")
            return {"error": str(e)}

    def _get_cpu_usage(self) -> Dict[str, float]:
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
        """Get system load average."""
        try:
            return [round(x, 2) for x in psutil.getloadavg()]
        except Exception as e:
            logger.error(f"Error getting load average: {str(e)}")
            return [-1, -1, -1]

    def _get_disk_usage(self) -> Dict[str, Any]:
        """Get disk usage information."""
        try:
            disk = psutil.disk_usage('/')
            return {
                "total_gb": round(disk.total / (1024 ** 3), 2),
                "used_gb": round(disk.used / (1024 ** 3), 2),
                "free_gb": round(disk.free / (1024 ** 3), 2),
                "percent": disk.percent
            }
        except Exception as e:
            logger.error(f"Error getting disk usage: {str(e)}")
            return {"error": str(e)}

    def _get_network_info(self) -> Dict[str, Any]:
        """Get network interface information."""
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
        """Check database connection health."""
        try:
            with app.app_context():
                connection_info = db_manager.get_connection_info(app)
                is_connected = db_manager.verify_connection(app)
                return {
                    "connected": is_connected,
                    "connection_info": connection_info
                }
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return {
                "connected": False,
                "error": str(e)
            }