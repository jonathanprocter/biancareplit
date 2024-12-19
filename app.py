
from flask import Flask, jsonify
from datetime import datetime
import psutil

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/health')
def api_health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'system': {
            'cpu_percent': psutil.cpu_percent(),
            'memory_percent': psutil.virtual_memory().percent
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
