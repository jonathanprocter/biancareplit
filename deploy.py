import subprocess
import sys
import logging
from scripts.reset_migrations import reset_database
from scripts.init_db import initialize_database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def deploy():
    """Deploy the application"""
    try:
        # Step 1: Reset database and migrations
        logger.info("Resetting database and migrations...")
        if not reset_database():
            raise Exception("Database reset failed")

        # Step 2: Initialize fresh database
        logger.info("Initializing fresh database...")
        if not initialize_database():
            raise Exception("Database initialization failed")

        # Step 3: Start application
        logger.info("Starting application...")
        subprocess.run(["flask", "run", "--host", "0.0.0.0", "--port", "81"], check=True)

        logger.info("Deployment successful!")
        return True

    except Exception as e:
        logger.error(f"Deployment failed: {str(e)}")
        return False

if __name__ == "__main__":
    if not deploy():
        sys.exit(1)
