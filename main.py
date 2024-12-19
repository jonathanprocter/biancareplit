
from flask import Flask
from flask_cors import CORS
from backend.config.unified_config import config_manager
from backend.monitoring.metrics_collector import metrics_collector
from backend.routes import monitoring
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # Load configuration
    config_manager.init_app(app)
    
    # Register blueprints
    app.register_blueprint(monitoring.bp)
    
    # Initialize monitoring
    @app.before_request
    def before_request():
        metrics_collector.collect_system_metrics()
    
    return app

if __name__ == "__main__":
    app = create_app()
    port = config_manager.get('server.port', 8080)
    host = config_manager.get('server.host', '0.0.0.0')
    app.run(host=host, port=port)
