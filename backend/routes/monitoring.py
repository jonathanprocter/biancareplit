
from flask import Blueprint, jsonify, Response, current_app
from ..monitoring.metrics_collector import metrics_collector
from ..monitoring.alert_manager import alert_manager
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

bp = Blueprint('monitoring', __name__, url_prefix='/monitoring')

@bp.route('/metrics')
def metrics():
    """Endpoint for Prometheus metrics"""
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

@bp.route('/status')
def system_status():
    """Get current system status with metrics and alerts"""
    metrics = metrics_collector.collect_system_metrics()
    alerts = alert_manager.check_system_metrics(metrics)
    return jsonify({
        'metrics': metrics,
        'alerts': alerts,
        'status': 'critical' if alerts else 'healthy'
    })

@bp.route('/health')
def health_check():
    """Basic health check endpoint"""
    try:
        metrics = metrics_collector.collect_system_metrics()
        return jsonify({
            'status': 'healthy',
            'version': current_app.config.get('VERSION', '1.0.0'),
            'metrics': metrics
        })
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500
