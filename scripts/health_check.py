#!/usr/bin/env python3
import requests
import sys
import time
import logging
from pathlib import Path

# Configure logging
log_dir = Path('logs')
log_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/health_check.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def check_system_health(url: str, timeout: int = 30) -> bool:
    """
    Check system health and exit with appropriate status code
    
    Args:
        url: Health check endpoint URL
        timeout: Timeout in seconds
    
    Returns:
        bool: True if system is healthy, False otherwise
    """
    try:
        response = requests.get(url, timeout=timeout)
        health_data = response.json()
        
        if health_data['status'] == 'unhealthy':
            logger.error("System is unhealthy!")
            for check in health_data['checks']:
                if check['status'] == 'fail':
                    logger.error(f"{check['name']}: {check['message']}")
            return False
            
        elif health_data['status'] == 'degraded':
            logger.warning("System is degraded:")
            for check in health_data['checks']:
                if "Warning" in check['message']:
                    logger.warning(f"{check['name']}: {check['message']}")
            return True
            
        else:
            logger.info("System is healthy")
            return True
            
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return False

if __name__ == "__main__":
    url = "http://localhost:8082/health"
    
    if check_system_health(url):
        sys.exit(0)
    else:
        sys.exit(1)
