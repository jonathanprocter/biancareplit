from flask import Blueprint, jsonify
import psutil
import logging
from datetime import datetime
from dataclasses import dataclass
from typing import List

logger = logging.getLogger(__name__)


@dataclass
class HealthCheck:
    name: str
    status: str
    message: str = ""


class SystemHealthMonitor:
    def __init__(self):
        self.thresholds = {
            "cpu_warning": 80,
            "cpu_critical": 90,
            "memory_warning": 80,
            "memory_critical": 90,
            "disk_warning": 80,
            "disk_critical": 90,
        }

    def check_cpu(self) -> HealthCheck:
        """Check CPU usage"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)

            if cpu_percent >= self.thresholds["cpu_critical"]:
                return HealthCheck(
                    name="CPU Usage",
                    status="fail",
                    message=f"Critical: CPU usage at {cpu_percent}%",
                )
            elif cpu_percent >= self.thresholds["cpu_warning"]:
                return HealthCheck(
                    name="CPU Usage",
                    status="pass",
                    message=f"Warning: CPU usage at {cpu_percent}%",
                )
            return HealthCheck(
                name="CPU Usage",
                status="pass",
                message=f"Normal: CPU usage at {cpu_percent}%",
            )
        except Exception as e:
            logger.error(f"CPU check failed: {str(e)}")
            return HealthCheck(
                name="CPU Usage", status="fail", message="Failed to check CPU usage"
            )

    def check_memory(self) -> HealthCheck:
        """Check memory usage"""
        try:
            memory = psutil.virtual_memory()
            if memory.percent >= self.thresholds["memory_critical"]:
                return HealthCheck(
                    name="Memory Usage",
                    status="fail",
                    message=f"Critical: Memory usage at {memory.percent}%",
                )
            elif memory.percent >= self.thresholds["memory_warning"]:
                return HealthCheck(
                    name="Memory Usage",
                    status="pass",
                    message=f"Warning: Memory usage at {memory.percent}%",
                )
            return HealthCheck(
                name="Memory Usage",
                status="pass",
                message=f"Normal: Memory usage at {memory.percent}%",
            )
        except Exception as e:
            logger.error(f"Memory check failed: {str(e)}")
            return HealthCheck(
                name="Memory Usage",
                status="fail",
                message="Failed to check memory usage",
            )

    def check_disk(self) -> HealthCheck:
        """Check disk usage"""
        try:
            disk = psutil.disk_usage("/")
            if disk.percent >= self.thresholds["disk_critical"]:
                return HealthCheck(
                    name="Disk Usage",
                    status="fail",
                    message=f"Critical: Disk usage at {disk.percent}%",
                )
            elif disk.percent >= self.thresholds["disk_warning"]:
                return HealthCheck(
                    name="Disk Usage",
                    status="pass",
                    message=f"Warning: Disk usage at {disk.percent}%",
                )
            return HealthCheck(
                name="Disk Usage",
                status="pass",
                message=f"Normal: Disk usage at {disk.percent}%",
            )
        except Exception as e:
            logger.error(f"Disk check failed: {str(e)}")
            return HealthCheck(
                name="Disk Usage", status="fail", message="Failed to check disk usage"
            )

    def check_network(self) -> HealthCheck:
        """Check network connectivity"""
        try:
            net_io = psutil.net_io_counters()
            return HealthCheck(
                name="Network",
                status="pass",
                message=f"Bytes sent: {net_io.bytes_sent}, received: {net_io.bytes_recv}",
            )
        except Exception as e:
            logger.error(f"Network check failed: {str(e)}")
            return HealthCheck(
                name="Network", status="fail", message="Failed to check network status"
            )

    def get_system_health(self) -> dict:
        """Get complete system health status"""
        checks = [
            self.check_cpu(),
            self.check_memory(),
            self.check_disk(),
            self.check_network(),
        ]

        if any(check.status == "fail" for check in checks):
            status = "unhealthy"
        elif any("Warning" in check.message for check in checks):
            status = "degraded"
        else:
            status = "healthy"

        return {
            "status": status,
            "checks": [
                {"name": check.name, "status": check.status, "message": check.message}
                for check in checks
            ],
            "timestamp": datetime.now().isoformat(),
        }


health_bp = Blueprint("health", __name__)
health_monitor = SystemHealthMonitor()


@health_bp.route("/health")
def health_check():
    """Health check endpoint"""
    return jsonify(health_monitor.get_system_health())


@health_bp.route("/readiness")
def readiness_check():
    """Check if application is ready to serve traffic"""
    return jsonify({"status": "ready", "timestamp": datetime.utcnow().isoformat()})
