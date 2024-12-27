import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Set

logger = logging.getLogger(__name__)


class RealtimeMetricsHandler:
    def __init__(self):
        self.connections: Set[websockets.WebSocketServerProtocol] = set()
        self.update_task = None

    async def register(self, websocket: websockets.WebSocketServerProtocol):
        self.connections.add(websocket)
        if not self.update_task:
            self.update_task = asyncio.create_task(self.broadcast_metrics())

    async def unregister(self, websocket: websockets.WebSocketServerProtocol):
        self.connections.remove(websocket)
        if not self.connections and self.update_task:
            self.update_task.cancel()
            self.update_task = None

    async def broadcast_metrics(self):
        while True:
            try:
                metrics = self.collect_metrics()
                message = json.dumps(metrics)
                await asyncio.gather(
                    *[connection.send(message) for connection in self.connections]
                )
            except Exception as e:
                logger.error(f"Error broadcasting metrics: {e}")
            await asyncio.sleep(2)  # Update every 2 seconds

    @staticmethod
    def collect_metrics() -> Dict:
        from ..monitoring.metrics_collector import metrics_collector

        return {
            "timestamp": datetime.now().isoformat(),
            "metrics": metrics_collector.collect_system_metrics(),
        }


metrics_handler = RealtimeMetricsHandler()
