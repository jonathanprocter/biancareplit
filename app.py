
from flask import Flask, jsonify
from datetime import datetime
import psutil

app = Flask(__name__)

@app.route('/')
def index():
    return jsonify({"status": "online"})

@app.route('/health')
@app.route('/api/health')
@app.route('/api/v1/health')
def health():
    try:
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "system": {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
