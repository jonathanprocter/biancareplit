from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, Analytics

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/api/analytics/start-session', methods=['POST'])
def start_session():
    try:
        data = request.get_json()
        session_type = data.get('sessionType')
        start_time = datetime.fromisoformat(data.get('startTime').replace('Z', '+00:00'))
        
        analytics = Analytics(
            session_type=session_type,
            start_time=start_time,
            status='active'
        )
        db.session.add(analytics)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'session_id': analytics.id
        }), 201
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@analytics_bp.route('/api/analytics/update', methods=['POST'])
def update_analytics():
    try:
        data = request.get_json()
        timestamp = datetime.fromisoformat(data.get('timestamp').replace('Z', '+00:00'))
        
        analytics_update = Analytics(
            event_type=data.get('event'),
            timestamp=timestamp,
            data=data
        )
        db.session.add(analytics_update)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'update_id': analytics_update.id
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
