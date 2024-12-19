
import multiprocessing

bind = "0.0.0.0:8080"
workers = multiprocessing.cpu_count() * 2 + 1
threads = 2
worker_class = 'gthread'
timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 50
errorlog = '-'
accesslog = '-'
