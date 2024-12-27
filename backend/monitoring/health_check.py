import psutil
import logging
from datetime import datetime
from typing import Dict, Any
from flask import current_app

logger = logging.getLogger(__name__)


class HealthCheck:
    def __init__(self):
        self.last_check = None

    def check_system(self) -> Dict[str, Any]:
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()

            system_status = {
                "cpu_usage": cpu_percent,
                "memory_usage": memory.percent,
                "memory_available": memory.available,
                "timestamp": datetime.now().isoformat(),
            }

            self.last_check = datetime.now()
            return system_status
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {"status": "error", "message": str(e)}

    def check_middleware(self) -> Dict[str, Any]:
        try:
            middleware_status = {}
            if hasattr(current_app, "middleware_manager"):
                for middleware in current_app.middleware_manager.middlewares:
                    middleware_status[middleware.__class__.__name__] = "healthy"
            return middleware_status
        except Exception as e:
            logger.error(f"Middleware check failed: {str(e)}")
            return {"status": "error", "message": str(e)}


health_checker = HealthCheck()
