from typing import Dict, Any
import jsonschema
import logging

logger = logging.getLogger(__name__)


class ConfigValidator:
    """Configuration validation system"""

    @staticmethod
    def websocket_schema() -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "reconnectAttempts": {"type": "integer", "minimum": 1},
                "reconnectInterval": {"type": "integer", "minimum": 1000},
                "pingInterval": {"type": "integer", "minimum": 1000},
                "timeout": {"type": "integer", "minimum": 1000},
            },
            "required": ["url", "reconnectAttempts", "reconnectInterval"],
        }

    @staticmethod
    def metrics_schema() -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "collectInterval": {"type": "integer", "minimum": 1000},
                "maxDataPoints": {"type": "integer", "minimum": 1},
                "retentionPeriod": {"type": "integer", "minimum": 3600},
                "thresholds": {
                    "type": "object",
                    "properties": {
                        "latency": {"type": "integer", "minimum": 0},
                        "errorRate": {"type": "number", "minimum": 0},
                        "uptimeMin": {"type": "number", "minimum": 0, "maximum": 100},
                    },
                    "required": ["latency", "errorRate", "uptimeMin"],
                },
            },
            "required": ["collectInterval", "maxDataPoints", "thresholds"],
        }

    @staticmethod
    def health_check_schema() -> Dict[str, Any]:
        threshold_schema = {
            "type": "object",
            "properties": {
                "warning": {"type": "number", "minimum": 0, "maximum": 100},
                "critical": {"type": "number", "minimum": 0, "maximum": 100},
            },
            "required": ["warning", "critical"],
        }

        return {
            "type": "object",
            "properties": {
                "interval": {"type": "integer", "minimum": 1000},
                "timeout": {"type": "integer", "minimum": 1000},
                "retries": {"type": "integer", "minimum": 1},
                "thresholds": {
                    "type": "object",
                    "properties": {
                        "cpu": threshold_schema,
                        "memory": threshold_schema,
                        "disk": threshold_schema,
                    },
                    "required": ["cpu", "memory", "disk"],
                },
            },
            "required": ["interval", "timeout", "thresholds"],
        }

    @staticmethod
    def testing_schema() -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "mockWebSocket": {"type": "boolean"},
                "mockLatency": {"type": "integer", "minimum": 0},
                "mockErrorRate": {"type": "number", "minimum": 0, "maximum": 1},
            },
            "required": ["mockWebSocket"],
        }

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate complete configuration"""
        try:
            # Validate each component's configuration
            components = {
                "websocket": self.websocket_schema(),
                "metrics": self.metrics_schema(),
                "healthCheck": self.health_check_schema(),
                "testing": self.testing_schema(),
            }

            for component, schema in components.items():
                if component not in config:
                    raise ValueError(f"Missing {component} configuration")

                jsonschema.validate(instance=config[component], schema=schema)

            # Additional cross-component validation
            self._validate_relationships(config)

            return True

        except (jsonschema.ValidationError, ValueError) as e:
            logger.error(f"Configuration validation failed: {str(e)}")
            raise

    def _validate_relationships(self, config: Dict[str, Any]) -> None:
        """Validate relationships between different components"""
        # Validate that health check interval is greater than metrics collection interval
        if config["healthCheck"]["interval"] <= config["metrics"]["collectInterval"]:
            raise ValueError(
                "Health check interval must be greater than metrics collection interval"
            )

        # Validate that WebSocket timeout is less than reconnect interval
        if config["websocket"]["timeout"] >= config["websocket"]["reconnectInterval"]:
            raise ValueError("WebSocket timeout must be less than reconnect interval")

        # Validate threshold relationships
        health_thresholds = config["healthCheck"]["thresholds"]

        for resource in ["cpu", "memory", "disk"]:
            if (
                health_thresholds[resource]["warning"]
                >= health_thresholds[resource]["critical"]
            ):
                raise ValueError(
                    f"{resource} warning threshold must be less than critical threshold"
                )
