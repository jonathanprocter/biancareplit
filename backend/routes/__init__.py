
from flask import Blueprint, Flask
from .api import bp as api_bp
from .auth import bp as auth_bp
from .admin import bp as admin_bp
from .monitoring import monitoring_bp
from backend.monitoring.metrics_router import metrics_bp

def register_blueprints(app: Flask):
    """Register all blueprints for the application"""
    app.register_blueprint(api_bp, url_prefix='/api/v1')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(monitoring_bp)
    app.register_blueprint(metrics_bp)
