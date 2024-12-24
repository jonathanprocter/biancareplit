
#!/usr/bin/env python3
import requests
import sys
import logging
import time

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

class DeploymentVerifier:
    def __init__(self, base_url: str = "http://0.0.0.0:3001", max_retries: int = 5):
        self.base_url = base_url
        self.max_retries = max_retries
        self.endpoints = ["/health", "/api/health"]
        self.timeout = 30

    def check_endpoint(self, endpoint: str) -> bool:
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.get(url, timeout=self.timeout)
            if response.status_code == 200:
                logger.info(f"✅ Endpoint {endpoint} is healthy")
                return True
            logger.error(f"❌ Endpoint {endpoint} returned status {response.status_code}")
            return False
        except requests.RequestException as e:
            logger.error(f"❌ Failed to connect to {endpoint}: {str(e)}")
            return False

    def verify_deployment(self) -> bool:
        logger.info("Starting deployment verification...")
        
        for attempt in range(self.max_retries):
            if attempt > 0:
                wait_time = min(5 * attempt, 30)
                logger.info(
                    f"Retrying in {wait_time}s... "
                    f"(Attempt {attempt + 1}/{self.max_retries})"
                )
                time.sleep(wait_time)

            success = all(self.check_endpoint(endpoint) for endpoint in self.endpoints)
            if success:
                logger.info("✅ Deployment verification successful!")
                return True

        logger.error(f"❌ Deployment verification failed after {self.max_retries} attempts")
        return False

if __name__ == "__main__":
    verifier = DeploymentVerifier()
    success = verifier.verify_deployment()
    sys.exit(0 if success else 1)
