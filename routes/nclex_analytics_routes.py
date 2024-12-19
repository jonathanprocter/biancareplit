from flask import Blueprint, jsonify, request
from models.nclex_analytics import NCLEXAnalytics
from models.nclex_performance import NCLEXPerformance
import os
from datetime import datetime, timedelta
from sqlalchemy import func
from nclex_analytics import NCLEXAnalytics as Analytics

analytics_routes = Blueprint('analytics_routes', __name__)

@analytics_routes.route('/api/nclex/analytics/performance', methods=['GET'])
def get_performance_analytics():
    user_id = request.args.get('user_id', 1)  # Default user_id for testing
    analytics = Analytics(db_connection=None)  # Connection handled by SQLAlchemy
    
    try:
        analysis = analytics.analyze_performance(user_id)
        NCLEXAnalytics.store_analysis(user_id, 'performance', analysis)
        return jsonify(analysis)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_routes.route('/api/nclex/analytics/coverage', methods=['GET'])
def get_test_plan_coverage():
    user_id = request.args.get('user_id', 1)
    analytics = Analytics(db_connection=None)
    
    try:
        coverage = analytics.track_test_plan_coverage(user_id)
        NCLEXAnalytics.store_analysis(user_id, 'coverage', coverage)
        return jsonify(coverage)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_routes.route('/api/nclex/analytics/prediction', methods=['GET'])
def get_nclex_prediction():
    user_id = request.args.get('user_id', 1)
    analytics = Analytics(db_connection=None)
    
    try:
        prediction = analytics.predict_nclex_readiness(user_id)
        NCLEXAnalytics.store_analysis(user_id, 'prediction', prediction)
        return jsonify(prediction)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_routes.route('/api/nclex/analytics/report', methods=['GET'])
def get_detailed_report():
    user_id = request.args.get('user_id', 1)
    analytics = Analytics(db_connection=None)
    
    try:
        report = analytics._generate_detailed_report(user_id)
        NCLEXAnalytics.store_analysis(user_id, 'report', report)
        return jsonify(report)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
