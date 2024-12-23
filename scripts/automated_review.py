"""Automated code review and deployment preparation system."""

import os
import logging
import asyncio
from typing import Dict, List, Optional
from pathlib import Path
from services.code_review_service import CodeReviewService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

class AutomatedReviewSystem:
    """Manages automated code review and deployment preparation."""
    
    def __init__(self):
        """Initialize the automated review system."""
        self.code_review_service = CodeReviewService()
        
    async def prepare_for_deployment(self, directory: str) -> Dict[str, Any]:
        """Prepare codebase for deployment with comprehensive checks."""
        results = {
            "reviewed": [],
            "fixed": [],
            "warnings": [],
            "errors": [],
            "metrics": {
                "code_quality": 0,
                "security_score": 0,
                "test_coverage": 0,
                "deployment_readiness": 0
            },
            "deployment_ready": False
        }
        
        try:
            # Step 1: Code Review
            logger.info("Starting comprehensive code review...")
            review_results = self.code_review_service.process_directory(directory)
            
            # Process review results
            if isinstance(review_results, dict) and "error" not in review_results:
                results["reviewed"].extend(review_results.get("fixed", []))
                results["errors"].extend(review_results.get("failed", []))
                
                # Analyze results and calculate metrics
                total_files = len(results["reviewed"]) + len(results["errors"])
                if total_files > 0:
                    success_rate = len(results["reviewed"]) / total_files
                    results["metrics"]["code_quality"] = round(success_rate * 10, 2)
                    results["metrics"]["deployment_readiness"] = round(success_rate * 10, 2)
                
                # Check if there are critical errors
                if not results["errors"]:
                    results["deployment_ready"] = True
                    logger.info("Code review completed successfully. Codebase is ready for deployment.")
                else:
                    logger.warning("Critical issues found during code review.")
                    results["deployment_ready"] = False
                    logger.info("Issues to fix before deployment:")
                    for error in results["errors"]:
                        logger.error(f"- {error}")
            
            return results
            
        except Exception as e:
            logger.error(f"Error in deployment preparation: {str(e)}")
            results["errors"].append(str(e))
            results["deployment_ready"] = False
            return results

async def main():
    """Main entry point for the automated review system."""
    try:
        review_system = AutomatedReviewSystem()
        project_root = Path(__file__).parent.parent
        
        logger.info("Starting automated review and deployment preparation...")
        logger.info("=" * 50)
        logger.info("Phase 1: Code Review and Analysis")
        
        results = await review_system.prepare_for_deployment(str(project_root))
        
        # Print detailed summary
        logger.info("\nDeployment Preparation Summary")
        logger.info("=" * 50)
        logger.info("Files Overview:")
        logger.info(f"- Reviewed: {len(results['reviewed'])}")
        logger.info(f"- Fixed: {len(results['fixed'])}")
        logger.info(f"- Warnings: {len(results['warnings'])}")
        logger.info(f"- Errors: {len(results['errors'])}")
        
        logger.info("\nQuality Metrics:")
        logger.info(f"- Code Quality: {results['metrics']['code_quality']}/10")
        logger.info(f"- Security Score: {results['metrics']['security_score']}/10")
        logger.info(f"- Test Coverage: {results['metrics']['test_coverage']}/10")
        logger.info(f"- Deployment Readiness: {results['metrics']['deployment_readiness']}/10")
        
        logger.info("\nDeployment Status:")
        if results['deployment_ready']:
            logger.info("✅ Codebase is READY for deployment")
        else:
            logger.error("❌ Codebase is NOT ready for deployment")
            
            if results['errors']:
                logger.error("\nCritical Issues to Address:")
                for i, error in enumerate(results['errors'], 1):
                    logger.error(f"{i}. {error}")
                logger.info("\nPlease fix these issues before proceeding with deployment.")
        
        return results["deployment_ready"]
        
    except Exception as e:
        logger.error(f"Fatal error in automated review process: {str(e)}")
        return False

if __name__ == "__main__":
    asyncio.run(main())
