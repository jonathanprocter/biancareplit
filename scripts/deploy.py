
import os
import logging
import subprocess
from pathlib import Path
from backend.monitoring.deployment_monitor import DeploymentMonitor
from services.claude_service import ClaudeService
from backend.config.system_verifier import SystemVerification

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_linters():
    """Run code formatters and linters"""
    logger.info("Running code formatters and linters...")
    try:
        subprocess.run(["npm", "run", "format"], check=True)
        subprocess.run(["npm", "run", "lint"], check=True)
        subprocess.run(["black", "."], check=True)
        subprocess.run(["flake8"], check=True)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Linting failed: {e}")
        return False

def analyze_and_fix_code():
    """Analyze and fix code with Claude"""
    logger.info("Starting code analysis with Claude...")
    claude = ClaudeService()
    
    for root, _, files in os.walk("."):
        for file in files:
            if file.endswith(('.py', '.ts', '.tsx', '.js')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r') as f:
                        code = f.read()
                        fixed_code = claude.fix_code(code)
                        if fixed_code:
                            with open(file_path, 'w') as fw:
                                fw.write(fixed_code)
                except Exception as e:
                    logger.error(f"Error fixing {file_path}: {e}")

def verify_system():
    """Verify system readiness"""
    logger.info("Verifying system...")
    verifier = SystemVerification()
    return verifier.verify_system()

def deploy():
    """Run the deployment process"""
    try:
        logger.info("Starting deployment process...")
        
        # Step 1: Run linters and formatters
        if not run_linters():
            raise Exception("Code formatting failed")
            
        # Step 2: Analyze and fix code
        analyze_and_fix_code()
        
        # Step 3: Verify system
        if not verify_system():
            raise Exception("System verification failed")
            
        # Step 4: Start monitoring
        monitor = DeploymentMonitor()
        monitor.start()
        
        logger.info("Deployment completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Deployment failed: {str(e)}")
        return False

if __name__ == "__main__":
    if not deploy():
        exit(1)
    exit(0)
