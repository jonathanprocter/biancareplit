from flask import Flask, jsonify
from datetime import datetime
import psutil
import os

app = Flask(__name__)

@app.route('/')
def index():
    return jsonify({"status": "running"})

@app.route('/health')
@app.route('/api/health')
def health_check():
    try:
        # Basic system checks
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "system": {
                "cpu_usage": psutil.cpu_percent(interval=1),
                "memory_usage": memory.percent,
                "disk_usage": disk.percent
            }
        }
        return jsonify(health_data), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    app.run(host='0.0.0.0', port=port)