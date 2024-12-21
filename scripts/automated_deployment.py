
import os
import logging
import subprocess
import asyncio
import openai
from pathlib import Path
from services.claude_service import ClaudeService
from services.ai_service import AIService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AutomatedDeployment:
    def __init__(self):
        self.claude = ClaudeService()
        self.ai_service = AIService()
        self.project_root = Path(__file__).parent.parent

    async def format_code(self):
        """Run code formatters"""
        logger.info("Running code formatters...")
        try:
            # Python formatting
            subprocess.run(["black", "."], check=True)
            subprocess.run(["flake8"], check=True)
            
            # JavaScript/TypeScript formatting
            subprocess.run(["npx", "prettier", "--write", "**/*.{js,jsx,ts,tsx,json}"], check=True)
            subprocess.run(["npx", "eslint", "--fix", "."], check=True)
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Formatting failed: {str(e)}")
            return False

    async def analyze_code(self, file_path: str):
        """Analyze code with AI models"""
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                
            # Get AI suggestions
            claude_result = await self.claude.review_and_fix_code(content)
            openai_result = await self.ai_service.analyze_code(content)
            
            if claude_result or openai_result:
                with open(file_path, 'w') as f:
                    f.write(claude_result or openai_result)
                    
            return True
        except Exception as e:
            logger.error(f"Error analyzing {file_path}: {str(e)}")
            return False

    async def process_directory(self):
        """Process all code files in project"""
        for root, _, files in os.walk(self.project_root):
            for file in files:
                if file.endswith(('.py', '.ts', '.tsx', '.js', '.jsx')):
                    file_path = os.path.join(root, file)
                    await self.analyze_code(file_path)

    async def verify_integration(self):
        """Verify code integration"""
        try:
            # Run TypeScript checks
            subprocess.run(["npm", "run", "check"], check=True)
            
            # Run Python tests
            subprocess.run(["python", "-m", "pytest"], check=True)
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Integration verification failed: {str(e)}")
            return False

    async def run_deployment(self):
        """Run the full deployment process"""
        try:
            logger.info("Starting automated deployment...")
            
            # Step 1: Format code
            if not await self.format_code():
                raise Exception("Code formatting failed")
                
            # Step 2: AI code analysis
            await self.process_directory()
            
            # Step 3: Verify integration
            if not await self.verify_integration():
                raise Exception("Integration verification failed")
                
            logger.info("Deployment preparation completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Deployment failed: {str(e)}")
            return False

if __name__ == "__main__":
    deployment = AutomatedDeployment()
    asyncio.run(deployment.run_deployment())
