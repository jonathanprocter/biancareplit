
from flask import Blueprint, jsonify
from datetime import datetime
from typing import Dict, Any
from .metrics_aggregator import metrics_aggregator
import logging

logger = logging.getLogger(__name__)
metrics_bp = Blueprint('metrics', __name__)

@metrics_bp.route('/api/v1/metrics/system', methods=['GET'])
def get_system_metrics() -> Dict[str, Any]:
    """Get current system metrics"""
    try:
        return jsonify(metrics_aggregator.collect_system_metrics())
    except Exception as e:
        logger.error(f"Error collecting system metrics: {str(e)}")
        return jsonify({"error": "Failed to collect system metrics"}), 500

@metrics_bp.route('/api/v1/metrics/requests', methods=['GET']) 
def get_request_metrics() -> Dict[str, Any]:
    """Get request metrics from buffer"""
    try:
        metrics = metrics_aggregator._metrics_buffer
        return jsonify({
            "request_metrics": metrics,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Error collecting request metrics: {str(e)}")
        return jsonify({"error": "Failed to collect request metrics"}), 500

@metrics_bp.route('/api/v1/metrics/health', methods=['GET'])
def get_health_metrics() -> Dict[str, Any]:
    """Get system health metrics"""
    try:
        system_metrics = metrics_aggregator.collect_system_metrics()
        return jsonify({
            "status": "healthy" if system_metrics["cpu_usage"] < 80 else "degraded",
            "metrics": system_metrics,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Error collecting health metrics: {str(e)}")
        return jsonify({"error": "Failed to collect health metrics"}), 500
