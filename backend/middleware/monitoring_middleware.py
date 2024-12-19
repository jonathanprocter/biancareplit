
from flask import request, g
import time
import psutil
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class MonitoringMiddleware:
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        @app.before_request
        def before_request():
            g.start_time = time.time()
            g.system_stats = self._get_system_stats()

        @app.after_request
        def after_request(response):
            if hasattr(g, 'start_time'):
                duration = time.time() - g.start_time
                response.headers['X-Response-Time'] = str(duration)
                self._log_request_metrics(duration, g.system_stats)
            return response

    def _get_system_stats(self) -> Dict[str, Any]:
        return {
            'cpu_percent': psutil.cpu_percent(),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_usage': psutil.disk_usage('/').percent
        }

    def _log_request_metrics(self, duration: float, stats: Dict[str, Any]):
        logger.info(
            f"Request: {request.method} {request.path} "
            f"Duration: {duration:.2f}s "
            f"CPU: {stats['cpu_percent']}% "
            f"Memory: {stats['memory_percent']}% "
            f"Disk: {stats['disk_usage']}%"
        )
