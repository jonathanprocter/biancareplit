
from flask import Blueprint, jsonify
import psutil
from datetime import datetime
from backend.core.health import HealthCheck

bp = Blueprint('health', __name__)
health_checker = HealthCheck()

@bp.route('/health')
def health_check():
    health_status = health_checker.get_system_health()
    return jsonify(health_status), 200 if health_status['status'] == 'healthy' else 503

@bp.route('/api/health')
def api_health():
    metrics = {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'system': {
            'cpu_percent': psutil.cpu_percent(),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_percent': psutil.disk_usage('/').percent
        }
    }
    
    is_healthy = all(v < 90 for v in metrics['system'].values())
    metrics['status'] = 'healthy' if is_healthy else 'degraded'
    
    return jsonify(metrics), 200 if is_healthy else 503
