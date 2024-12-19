"""Main application module for the NCLEX coaching platform."""
import os
from flask import Flask
from backend import create_app
from backend.routes.health import bp as health_bp

app = create_app()
app.register_blueprint(health_bp)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True
    )