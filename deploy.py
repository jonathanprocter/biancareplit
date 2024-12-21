import subprocess
import sys
import logging
from scripts.reset_migrations import reset_database
from scripts.init_db import initialize_database
from backend.monitoring.deployment_monitor import DeploymentMonitor
from backend.config.system_verifier import SystemVerification

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def deploy():
    """Deploy the application"""
    try:
        # Initialize monitoring
        monitor = DeploymentMonitor()

        # Step 1: Verify system
        logger.info("Verifying system configuration...")
        verifier = SystemVerification(context_manager)
        if not verifier.verify_system():
            raise Exception("System verification failed")

        # Step 2: Reset database and migrations
        logger.info("Resetting database and migrations...")
        if not reset_database():
            raise Exception("Database reset failed")

        # Step 3: Initialize fresh database
        logger.info("Initializing fresh database...")
        if not initialize_database():
            raise Exception("Database initialization failed")

        # Step 4: Start application with monitoring
        logger.info("Starting application...")
        subprocess.run(
            ["gunicorn", "--config", "gunicorn.conf.py", "wsgi:app"], check=True
        )

        logger.info("Deployment successful!")
        return True

    except Exception as e:
        logger.error(f"Deployment failed: {str(e)}")
        return False


if __name__ == "__main__":
    if not deploy():
        sys.exit(1)
