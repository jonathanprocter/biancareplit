import logging
from backend.deployment_manager import deploy_application
from backend.monitoring.deployment_monitor import DeploymentMonitor
from backend.config.system_verifier import SystemVerification
from backend.core.context import context_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def deploy():
    try:
        logger.info("Starting deployment process...")

        # Initialize monitoring
        monitor = DeploymentMonitor()
        monitor.start()

        # Verify system configuration
        verifier = SystemVerification(context_manager)
        if not verifier.verify_system():
            raise Exception("System verification failed")

        # Deploy application
        deploy_application()

        logger.info("Deployment successful!")
        return True

    except Exception as e:
        logger.error(f"Deployment failed: {str(e)}")
        return False


if __name__ == "__main__":
    success = deploy()
    exit(0 if success else 1)
