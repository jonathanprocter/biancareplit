from typing import Dict, Any

APP_CONFIG_SCHEMA = {
    "type": "object",
    "properties": {
        "app": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "environment": {"type": "string"},
                "debug": {"type": "boolean"},
                "host": {"type": "string"},
                "port": {"type": "integer"},
                "secret_key": {"type": "string"},
                "allowed_origins": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["name", "environment", "secret_key"],
        }
    },
}

DATABASE_CONFIG_SCHEMA = {
    "type": "object",
    "properties": {
        "database": {
            "type": "object",
            "properties": {
                "driver": {"type": "string"},
                "host": {"type": "string"},
                "port": {"type": "integer"},
                "name": {"type": "string"},
                "user": {"type": "string"},
                "password": {"type": "string"},
                "pool_size": {"type": "integer"},
                "ssl_mode": {"type": "string"},
            },
            "required": ["driver", "host", "port", "name", "user", "password"],
        }
    },
}

METRICS_CONFIG_SCHEMA = {
    "type": "object",
    "properties": {
        "metrics": {
            "type": "object",
            "properties": {
                "enabled": {"type": "boolean"},
                "collect_interval": {"type": "integer", "minimum": 1000},
                "retention_period": {"type": "integer", "minimum": 3600},
                "thresholds": {
                    "type": "object",
                    "properties": {
                        "latency": {"type": "integer", "minimum": 0},
                        "error_rate": {"type": "number", "minimum": 0},
                        "uptime_min": {"type": "number", "minimum": 0, "maximum": 100},
                    },
                    "required": ["latency", "error_rate", "uptime_min"],
                },
            },
            "required": ["enabled", "collect_interval", "thresholds"],
        }
    },
}

MIDDLEWARE_CONFIG_SCHEMA = {
    "type": "object",
    "properties": {
        "middleware": {
            "type": "object",
            "properties": {
                "enabled": {"type": "boolean"},
                "order": {"type": "array", "items": {"type": "string"}},
                "security": {
                    "type": "object",
                    "properties": {
                        "enabled": {"type": "boolean"},
                        "force_https": {"type": "boolean"},
                    },
                },
                "logging": {
                    "type": "object",
                    "properties": {
                        "enabled": {"type": "boolean"},
                        "level": {"type": "string"},
                    },
                },
            },
            "required": ["enabled", "order"],
        }
    },
}
