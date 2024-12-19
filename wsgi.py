
from backend.app_factory import create_app

application = create_app('production')
app = application

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
