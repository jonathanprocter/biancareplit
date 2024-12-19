
#!/usr/bin/env python3
import requests
import sys
import logging
import time
from typing import List, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DeploymentVerifier:
    def __init__(self, base_url: str = "http://0.0.0.0:8080", max_retries: int = 3):
        self.base_url = base_url
        self.max_retries = max_retries
        self.endpoints = ["/health", "/api/health"]

    def verify_deployment(self) -> bool:
        for attempt in range(self.max_retries):
            try:
                for endpoint in self.endpoints:
                    url = f"{self.base_url}{endpoint}"
                    response = requests.get(url, timeout=30)
                    if response.status_code != 200:
                        logger.error(f"Endpoint {endpoint} returned status {response.status_code}")
                        return False
                    logger.info(f"Endpoint {endpoint} is healthy")
                return True
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
                if attempt < self.max_retries - 1:
                    time.sleep(5)
                else:
                    logger.error(f"Deployment verification failed after {self.max_retries} attempts")
                    return False

if __name__ == "__main__":
    verifier = DeploymentVerifier()
    if verifier.verify_deployment():
        logger.info("Deployment verification successful")
        sys.exit(0)
    else:
        logger.error("Deployment verification failed")
        sys.exit(1)
