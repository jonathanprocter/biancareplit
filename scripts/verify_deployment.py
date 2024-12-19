
#!/usr/bin/env python3
import requests
import sys
import logging
from typing import List, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DeploymentVerifier:
    def __init__(self, base_url: str = "http://0.0.0.0:8080"):
        self.base_url = base_url
        self.endpoints = ["/health", "/api/health"]

    def verify_deployment(self) -> bool:
        try:
            for endpoint in self.endpoints:
                url = f"{self.base_url}{endpoint}"
                response = requests.get(url, timeout=10)
                if response.status_code != 200:
                    logger.error(f"Endpoint {endpoint} returned status {response.status_code}")
                    return False
                logger.info(f"Endpoint {endpoint} is healthy")
            return True
        except Exception as e:
            logger.error(f"Deployment verification failed: {str(e)}")
            return False

if __name__ == "__main__":
    verifier = DeploymentVerifier()
    if verifier.verify_deployment():
        logger.info("Deployment verification successful")
        sys.exit(0)
    else:
        logger.error("Deployment verification failed")
        sys.exit(1)
