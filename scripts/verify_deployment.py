
import sys
import logging
import requests
import psutil
import os
from typing import Dict, List, Any
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DeploymentVerifier:
    def __init__(self, base_url: str = "http://0.0.0.0:8080"):
        self.base_url = base_url
        self.required_endpoints = [
            "/api/health",
            "/health/health",
            "/api/metrics"
        ]
        self.required_services = [
            "flask",
            "prometheus_client",
            "gunicorn"
        ]

    def verify_all(self) -> bool:
        """Run all verification checks"""
        checks = [
            self.verify_endpoints(),
            self.verify_services(),
            self.verify_system_resources(),
            self.verify_configurations()
        ]
        return all(checks)

    def verify_endpoints(self) -> bool:
        """Verify all required endpoints are responding"""
        for endpoint in self.required_endpoints:
            try:
                url = f"{self.base_url}{endpoint}"
                response = requests.get(url, timeout=5)
                response.raise_for_status()
                logger.info(f"Endpoint {endpoint} is operational")
            except Exception as e:
                logger.error(f"Endpoint {endpoint} verification failed: {str(e)}")
                return False
        return True

    def verify_services(self) -> bool:
        """Verify required services are running"""
        for service in self.required_services:
            try:
                found = False
                for proc in psutil.process_iter(['name']):
                    if service in proc.info['name']:
                        found = True
                        break
                if not found:
                    logger.error(f"Service {service} is not running")
                    return False
                logger.info(f"Service {service} is running")
            except Exception as e:
                logger.error(f"Service verification failed: {str(e)}")
                return False
        return True

    def verify_system_resources(self) -> bool:
        """Verify system has sufficient resources"""
        try:
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')

            if cpu_percent > 90:
                logger.error("CPU usage too high")
                return False
            if memory.percent > 90:
                logger.error("Memory usage too high")
                return False
            if disk.percent > 90:
                logger.error("Disk usage too high")
                return False

            logger.info("System resources check passed")
            return True
        except Exception as e:
            logger.error(f"Resource verification failed: {str(e)}")
            return False

    def verify_configurations(self) -> bool:
        """Verify configuration files exist and are valid"""
        required_configs = [
            "config/config.yaml",
            "config/autoscale.yaml",
            "config/deployment.yaml"
        ]

        for config_path in required_configs:
            if not Path(config_path).exists():
                logger.error(f"Missing configuration file: {config_path}")
                return False
            
        logger.info("Configuration files verified")
        return True

if __name__ == "__main__":
    verifier = DeploymentVerifier()
    if verifier.verify_all():
        logger.info("All deployment checks passed")
        sys.exit(0)
    else:
        logger.error("Deployment verification failed")
        sys.exit(1)
