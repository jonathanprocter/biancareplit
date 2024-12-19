
from flask import Blueprint, jsonify
import psutil
import os
from datetime import datetime
import logging

bp = Blueprint('health', __name__)
logger = logging.getLogger(__name__)

@bp.route('/health', methods=['GET'])
def health_check():
    try:
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'system': {
                'cpu_percent': psutil.cpu_percent(),
                'memory_percent': psutil.virtual_memory().percent
            }
        })
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500

@bp.route('/health/detailed', methods=['GET'])
def detailed_health():
    try:
        memory = psutil.virtual_memory()
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'system': {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory': {
                    'total': memory.total,
                    'available': memory.available,
                    'percent': memory.percent
                },
                'disk': {
                    'usage': psutil.disk_usage('/').percent
                }
            }
        })
    except Exception as e:
        logger.error(f"Detailed health check failed: {str(e)}")
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500
