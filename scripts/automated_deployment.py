import logging
from backend.monitoring.deployment_monitor import DeploymentMonitor
from backend.config.system_verifier import SystemVerification
from backend.core.context import context_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_deployment():
    try:
        logger.info("Starting automated deployment process...")

        # Initialize monitoring
        monitor = DeploymentMonitor()
        monitor.start()

        # Verify system
        verifier = SystemVerification(context_manager)
        if not verifier.verify_system():
            raise Exception("System verification failed")

        logger.info("System verification passed")

        # Initialize application
        from backend.deployment_manager import deploy_application

        deploy_application()

        logger.info("Deployment completed successfully!")
        return True

    except Exception as e:
        logger.error(f"Deployment failed: {str(e)}")
        return False


if __name__ == "__main__":
    success = run_deployment()
    exit(0 if success else 1)
