#!/usr/bin/env python3
"""Automated code review and deployment preparation system."""

import os
import logging
import json
from datetime import datetime
from typing import Dict, Any
from pathlib import Path
import sys
from pathlib import Path
# Add parent directory to Python path for imports
sys.path.append(str(Path(__file__).parent.parent))
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
        self.results_dir = Path("deployment_reviews")
        self.results_dir.mkdir(exist_ok=True)

    def prepare_for_deployment(self, directory: str) -> Dict[str, Any]:
        """Prepare codebase for deployment with comprehensive checks."""
        start_time = datetime.now()
        results = {
            "timestamp": start_time.isoformat(),
            "reviewed": [],
            "warnings": [],
            "errors": [],
            "metrics": {
                "code_quality": 0,
                "security_score": 0
            },
            "security": {
                "vulnerabilities": [],
                "sensitive_data": []
            },
            "deployment_ready": False
        }

        try:
            logger.info(f"Starting deployment preparation for: {directory}")

            # Code Review
            logger.info("Starting comprehensive code review...")
            review_results = self.code_review_service.process_directory(directory)

            if isinstance(review_results, dict) and "error" not in review_results:
                # Process code review results
                for file_path, file_review in review_results.get("files", {}).items():
                    if file_review.get("status") == "success":
                        results["reviewed"].append(file_path)
                        review = file_review.get("review", {})

                        # Check for security issues
                        for issue in review.get("issues", []):
                            if issue.get("type") == "security":
                                results["security"]["vulnerabilities"].append({
                                    "file": file_path,
                                    "description": issue.get("description"),
                                    "severity": issue.get("severity"),
                                    "line": issue.get("line_number")
                                })

                            # Check for sensitive data exposure
                            if "sensitive" in issue.get("type", "").lower():
                                results["security"]["sensitive_data"].append({
                                    "file": file_path,
                                    "description": issue.get("description"),
                                    "line": issue.get("line_number")
                                })
                    else:
                        results["errors"].append({
                            "file": file_path,
                            "error": file_review.get("error", "Unknown error")
                        })

                # Calculate metrics
                total_files = len(results["reviewed"]) + len(results["errors"])
                if total_files > 0:
                    success_rate = len(results["reviewed"]) / total_files
                    results["metrics"]["code_quality"] = round(success_rate * 10, 2)

                    # Calculate security score
                    security_issues = len(results["security"]["vulnerabilities"])
                    results["metrics"]["security_score"] = round(max(0, 10 - security_issues), 2)

            # Set deployment readiness based on metrics
            results["deployment_ready"] = (
                results["metrics"]["code_quality"] >= 7.0 and
                results["metrics"]["security_score"] >= 7.0 and
                not results["security"]["vulnerabilities"]
            )

            # Save results
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            results_file = self.results_dir / f"deployment_review_{timestamp}.json"
            with open(results_file, "w") as f:
                json.dump(results, f, indent=2)

            logger.info(f"Deployment preparation completed. Results saved to {results_file}")
            return results

        except Exception as e:
            logger.error(f"Error in deployment preparation: {str(e)}")
            results["errors"].append(str(e))
            results["deployment_ready"] = False
            return results

def main():
    """Main entry point for the automated review system."""
    try:
        review_system = AutomatedReviewSystem()
        project_root = Path(__file__).parent.parent

        logger.info("Starting automated review and deployment preparation...")
        logger.info("=" * 50)

        results = review_system.prepare_for_deployment(str(project_root))

        # Print detailed summary
        logger.info("\nDeployment Preparation Summary")
        logger.info("=" * 50)

        logger.info("\nCode Review Results:")
        logger.info(f"Files Reviewed: {len(results['reviewed'])}")
        logger.info(f"Errors Found: {len(results['errors'])}")

        logger.info("\nSecurity Analysis:")
        logger.info(f"Vulnerabilities Found: {len(results['security']['vulnerabilities'])}")
        logger.info(f"Sensitive Data Issues: {len(results['security']['sensitive_data'])}")

        logger.info("\nQuality Metrics:")
        for metric, score in results['metrics'].items():
            logger.info(f"- {metric.replace('_', ' ').title()}: {score}/10")

        logger.info("\nDeployment Status:")
        if results['deployment_ready']:
            logger.info("✅ Codebase is READY for deployment")
        else:
            logger.error("❌ Codebase is NOT ready for deployment")

            if results['errors']:
                logger.error("\nCritical Issues to Address:")
                for error in results['errors']:
                    if isinstance(error, dict):
                        logger.error(f"- File: {error['file']}")
                        logger.error(f"  Error: {error['error']}")
                    else:
                        logger.error(f"- {error}")

            if results['security']['vulnerabilities']:
                logger.error("\nSecurity Vulnerabilities:")
                for vuln in results['security']['vulnerabilities']:
                    logger.error(f"- [{vuln['severity']}] {vuln['file']}: {vuln['description']}")

            logger.info("\nPlease address these issues before proceeding with deployment.")

        # Save results summary
        summary_file = review_system.results_dir / "latest_review_summary.txt"
        with open(summary_file, "w") as f:
            f.write(f"Deployment Review Summary ({datetime.now().isoformat()})\n")
            f.write("=" * 50 + "\n")
            f.write(f"Deployment Ready: {results['deployment_ready']}\n")
            f.write(f"Code Quality Score: {results['metrics']['code_quality']}/10\n")
            f.write(f"Security Score: {results['metrics']['security_score']}/10\n")
            f.write(f"Files Reviewed: {len(results['reviewed'])}\n")
            f.write(f"Errors Found: {len(results['errors'])}\n\n")
            f.write("See detailed JSON report in the deployment_reviews directory.\n")

        return results["deployment_ready"]

    except Exception as e:
        logger.error(f"Fatal error in automated review process: {str(e)}")
        return False

if __name__ == "__main__":
    main()