
#!/usr/bin/env python3
import requests
import sys
import time
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/health_check.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def check_health(url: str, max_retries: int = 3, retry_delay: int = 5) -> bool:
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=10)
            health_data = response.json()
            
            if health_data['status'] == 'healthy':
                logger.info("System is healthy")
                return True
            
            if health_data['status'] == 'degraded':
                logger.warning("System is degraded - attempting recovery")
                time.sleep(retry_delay)
                continue
                
            logger.error(f"System is unhealthy: {health_data}")
            return False
            
        except Exception as e:
            logger.error(f"Health check failed (attempt {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                return False
    
    return False

if __name__ == "__main__":
    urls = [
        "http://0.0.0.0:8080/health",
        "http://0.0.0.0:8080/api/health"
    ]
    
    healthy = all(check_health(url) for url in urls)
    sys.exit(0 if healthy else 1)
