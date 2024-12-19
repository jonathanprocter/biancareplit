
import os

class DeploymentConfig:
    PORT = int(os.getenv('PORT', 8080))
    HOST = '0.0.0.0'
    WORKERS = int(os.getenv('GUNICORN_WORKERS', 4))
    THREADS = int(os.getenv('GUNICORN_THREADS', 2))
    WORKER_CLASS = 'gthread'
    TIMEOUT = 120
    KEEP_ALIVE = 5
    MAX_REQUESTS = 1000
    MAX_REQUESTS_JITTER = 50
    GRACEFUL_TIMEOUT = 30
    
    @classmethod
    def get_bind(cls):
        return f"{cls.HOST}:{cls.PORT}"
