from backend.deployment_config import DeploymentConfig

bind = DeploymentConfig.get_bind()
workers = DeploymentConfig.WORKERS
threads = DeploymentConfig.THREADS
worker_class = DeploymentConfig.WORKER_CLASS
timeout = DeploymentConfig.TIMEOUT
keepalive = DeploymentConfig.KEEP_ALIVE
max_requests = DeploymentConfig.MAX_REQUESTS
max_requests_jitter = DeploymentConfig.MAX_REQUESTS_JITTER
