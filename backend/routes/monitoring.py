from flask import Blueprint, jsonify, Response, current_app
from ..monitoring.metrics_collector import metrics_collector
from ..monitoring.alert_manager import alert_manager
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

bp = Blueprint("monitoring", __name__, url_prefix="/monitoring")


@bp.route("/metrics")
def metrics():
    """Endpoint for Prometheus metrics"""
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)


@bp.route("/status")
def system_status():
    """Get current system status with metrics and alerts"""
    metrics = metrics_collector.collect_metrics()
    alerts = alert_manager.check_system_metrics(metrics)

    # Include historical data
    history = metrics_collector.get_metrics_history()
    trend = _calculate_trend(history[-10:]) if len(history) >= 10 else "stable"

    return jsonify(
        {
            "current": metrics,
            "history": history[-10:],
            "alerts": alerts,
            "status": metrics.get("status", "unknown"),
            "trend": trend,
        }
    )


def _calculate_trend(history: list) -> str:
    if not history:
        return "stable"

    recent_status = [m.get("status", "unknown") for m in history]
    if recent_status.count("critical") > len(recent_status) * 0.3:
        return "deteriorating"
    elif recent_status.count("healthy") > len(recent_status) * 0.7:
        return "improving"
    return "stable"


@bp.route("/health")
def health_check():
    """Basic health check endpoint"""
    try:
        metrics = metrics_collector.collect_system_metrics()
        return jsonify(
            {
                "status": "healthy",
                "version": current_app.config.get("VERSION", "1.0.0"),
                "metrics": metrics,
            }
        )
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500
