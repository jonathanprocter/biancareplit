
from flask import Flask, jsonify, request, render_template
from datetime import datetime
import logging
import os
from logging.handlers import RotatingFileHandler
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
if not os.path.exists('logs'):
    os.makedirs('logs')

file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('Application startup')

# Configuration
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'

app.config.from_object(Config)

# Basic error handling
@app.errorhandler(404)
def not_found_error(error):
    app.logger.error(f'Page not found: {request.url}')
    return jsonify({'error': 'Not found', 'path': request.path}), 404

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f'Server Error: {error}')
    return jsonify({'error': 'Internal server error'}), 500

# Health check endpoints
@app.route('/health')
@app.route('/api/health')
@app.route('/api/v1/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'environment': os.environ.get('FLASK_ENV', 'development'),
        'version': '1.0.0'
    })

# Root endpoint
@app.route('/')
def home():
    app.logger.info('Home page accessed')
    return render_template('index.html')

# Middleware for request logging
@app.before_request
def before_request():
    app.logger.info(f'Request: {request.method} {request.url}')

@app.after_request
def after_request(response):
    app.logger.info(f'Response: {response.status}')
    return response

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
