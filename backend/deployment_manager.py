
import os
import logging
from flask import Flask
from .config.unified_config import config_manager
from .middleware.middleware_manager import middleware_manager
from .monitoring.deployment_monitor import DeploymentMonitor

logger = logging.getLogger(__name__)

def create_production_app() -> Flask:
    app = Flask(__name__)
    
    try:
        # Load configuration
        config_manager.init_app(app)
        
        # Initialize middleware
        middleware_manager.initialize_app(app)
        
        # Initialize monitoring
        deployment_monitor = DeploymentMonitor()
        deployment_monitor.init_app(app)
        
        # Set production configs
        app.config['ENV'] = 'production'
        app.config['DEBUG'] = False
        
        return app
    except Exception as e:
        logger.error(f"Failed to create production app: {str(e)}")
        raise

def run_production():
    app = create_production_app()
    port = int(os.getenv('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
