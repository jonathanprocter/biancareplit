
from backend.app_factory import create_app
from backend.routes.health import bp as health_bp

application = create_app('production')
app = application

# Register health blueprint
app.register_blueprint(health_bp, url_prefix='/api')
app.register_blueprint(health_bp, url_prefix='/health')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
