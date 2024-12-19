
from flask import Flask, jsonify
from datetime import datetime
import psutil

app = Flask(__name__)

@app.route('/health')
def health():
    try:
        metrics = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'uptime': True,
            'cpu': psutil.cpu_percent(),
            'memory': psutil.virtual_memory().percent
        }
        return jsonify(metrics), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
