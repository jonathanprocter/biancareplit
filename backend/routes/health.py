from flask import Blueprint, jsonify
import psutil
from datetime import datetime

bp = Blueprint("health", __name__)


@bp.route("/health", methods=["GET"])
def health_check():
    try:
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Service is running",
        }
        return jsonify(health_status), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@bp.route("/api/health", methods=["GET"])
def api_health():
    try:
        metrics = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "system": {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
            },
        }
        return jsonify(metrics), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
