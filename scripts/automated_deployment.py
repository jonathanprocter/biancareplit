
import os
import logging
import asyncio
from backend.monitoring.deployment_monitor import DeploymentMonitor
from backend.config.system_verifier import SystemVerification
from backend.core.context import context_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_deployment():
    try:
        logger.info("Starting automated deployment process...")
        
        # Initialize monitoring
        monitor = DeploymentMonitor()
        await monitor.start()
        
        # Verify system
        verifier = SystemVerification(context_manager)
        if not verifier.verify_system():
            raise Exception("System verification failed")
            
        logger.info("System verification passed")
        
        # Initialize application
        from backend.deployment_manager import deploy_application
        await deploy_application()
        
        logger.info("Deployment completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Deployment failed: {str(e)}")
        return False

if __name__ == "__main__":
    asyncio.run(run_deployment())
