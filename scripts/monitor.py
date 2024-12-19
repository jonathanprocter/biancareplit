
#!/usr/bin/env python3
import time
import logging
from backend.monitoring.deployment_monitor import DeploymentMonitor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    monitor = DeploymentMonitor()
    check_interval = 60  # seconds
    
    while True:
        try:
            health = monitor.check_health()
            logger.info(f"Health Check: {health['status']}")
            logger.info(f"Metrics: {health['metrics']}")
            time.sleep(check_interval)
        except KeyboardInterrupt:
            logger.info("Monitoring stopped")
            break
        except Exception as e:
            logger.error(f"Monitoring error: {e}")
            time.sleep(check_interval)

if __name__ == "__main__":
    main()
