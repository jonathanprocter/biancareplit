"""Code review analysis system for the NCLEX coaching platform."""

import os
import subprocess
import requests
import logging
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, List, Tuple
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Supported file extensions and their languages
SUPPORTED_LANGUAGES = {
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".py": "Python",
}

# OpenAI API configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
API_URL = "https://api.openai.com/v1/chat/completions"

# Review results structure
class ReviewResult:
    def __init__(self, file_path: str, language: str):
        self.file_path = file_path
        self.language = language
        self.issues = []
        self.suggestions = []
        self.linting_errors = []
        self.success = True
        self.error = None
        
    def to_dict(self) -> dict:
        return {
            "file_path": str(self.file_path),
            "language": self.language,
            "issues": self.issues,
            "suggestions": self.suggestions,
            "linting_errors": self.linting_errors,
            "success": self.success,
            "error": str(self.error) if self.error else None
        }

class CodeReviewSystem:
    """Manages code review analysis."""

    def __init__(self):
        """Initialize the code review system."""
        self.openai_api_key = OPENAI_API_KEY
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json"
        }
        
        # Create output directory for reports
        self.output_dir = Path("code_review_reports")
        self.output_dir.mkdir(exist_ok=True)

    def detect_language(self, file_path: str) -> Optional[str]:
        """Detect the programming language based on file extension."""
        _, ext = os.path.splitext(file_path)
        return SUPPORTED_LANGUAGES.get(ext)

    async def analyze_code(self, file_path: str, language: str) -> ReviewResult:
        """Analyze code using OpenAI API and return review results."""
        result = ReviewResult(file_path, language)
        
        try:
            with open(file_path, "r", encoding="utf-8") as file:
                code_content = file.read()

            prompt = f"""
            You are a code review expert. Analyze this {language} code and provide a JSON response with the following structure:
            {{
                "issues": [
                    {{"type": "bug|security|performance|style", "severity": "high|medium|low", "description": "description", "line": "line_number", "suggestion": "fix suggestion"}}
                ],
                "general_suggestions": ["suggestion1", "suggestion2"],
                "code_quality_score": 0-100
            }}

            Focus on:
            1. Syntax errors and bugs
            2. Security vulnerabilities
            3. Performance issues
            4. Integration problems
            5. Code style and best practices

            Here's the code to analyze:

            {code_content}
            """

            payload = {
                "model": "gpt-4",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "response_format": { "type": "json_object" }
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(API_URL, headers=self.headers, json=payload, timeout=30) as response:
                    if response.status == 200:
                        analysis = await response.json()
                        result.issues = analysis.get("issues", [])
                        result.suggestions = analysis.get("general_suggestions", [])
                        logger.info(f"Successfully analyzed {file_path}")
                    else:
                        error_text = await response.text()
                        logger.error(f"API error: {response.status} - {error_text}")
                        result.success = False
                        result.error = f"API error: {response.status}"

        except Exception as e:
            logger.error(f"Error analyzing {file_path}: {str(e)}")
            result.success = False
            result.error = str(e)

        return result

    def apply_linters(self, file_path: str, language: str) -> bool:
        """Apply language-specific linters and formatters."""
        try:
            if language == "Python":
                logger.info(f"Applying Black and Flake8 to {file_path}")
                subprocess.run(["black", file_path], check=True)
                subprocess.run(["flake8", file_path], check=True)
            elif language in ["JavaScript", "TypeScript"]:
                logger.info(f"Applying ESLint and Prettier to {file_path}")
                subprocess.run(["npx", "eslint", "--fix", file_path], check=True)
                subprocess.run(["npx", "prettier", "--write", file_path], check=True)
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Linting error for {file_path}: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during linting {file_path}: {str(e)}")
            return False

    def save_fixed_code(self, file_path: str, fixed_code: str) -> bool:
        """Save the fixed code back to the file."""
        try:
            with open(file_path, "w", encoding="utf-8") as file:
                file.write(fixed_code)
            logger.info(f"Successfully saved fixes to {file_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving fixes to {file_path}: {str(e)}")
            return False

    async def process_directory(self, directory: str, max_concurrent: int = 5) -> Dict[str, List[dict]]:
        """Process all supported files in the directory recursively."""
        results = {
            "analyzed": [],
            "failed": [],
            "skipped": []
        }
        
        # Get all files to process
        files_to_process = []
        for root, _, files in os.walk(directory):
            for file_name in files:
                file_path = os.path.join(root, file_name)
                language = self.detect_language(file_path)
                if language:
                    files_to_process.append((file_path, language))
                else:
                    results["skipped"].append({"file": file_path, "reason": "Unsupported language"})

        # Process files concurrently with rate limiting
        semaphore = asyncio.Semaphore(max_concurrent)
        async def process_file(file_path: str, language: str) -> ReviewResult:
            async with semaphore:
                logger.info(f"Analyzing {file_path} ({language})")
                return await self.analyze_code(file_path, language)

        # Create tasks for all files
        tasks = [process_file(file_path, language) for file_path, language in files_to_process]
        
        # Wait for all tasks to complete
        completed_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_data = {
            "timestamp": timestamp,
            "summary": {
                "total_files": len(files_to_process),
                "analyzed": 0,
                "failed": 0,
                "skipped": len(results["skipped"]),
                "total_issues": 0
            },
            "results": []
        }

        for result in completed_results:
            if isinstance(result, Exception):
                logger.error(f"Failed to process file: {str(result)}")
                results["failed"].append({"file": "Unknown", "error": str(result)})
                report_data["summary"]["failed"] += 1
                continue
                
            if result.success:
                results["analyzed"].append(result.to_dict())
                report_data["results"].append(result.to_dict())
                report_data["summary"]["analyzed"] += 1
                report_data["summary"]["total_issues"] += len(result.issues)
            else:
                results["failed"].append({
                    "file": result.file_path,
                    "error": result.error
                })
                report_data["summary"]["failed"] += 1

        # Save report
        report_file = self.output_dir / f"code_review_report_{timestamp}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2)
            
        logger.info(f"Code review report saved to {report_file}")
        return results

async def main():
    """Main entry point for the code review system."""
    try:
        import aiohttp
        review_system = CodeReviewSystem()
        project_root = Path(__file__).parent.parent
        
        logger.info("Starting code review analysis process...")
        logger.info(f"Project root: {project_root}")
        logger.info("This may take several minutes depending on the codebase size...")
        
        results = await review_system.process_directory(str(project_root))
        
        # Print summary
        logger.info("\nCode Review Summary:")
        logger.info(f"Analyzed files: {len(results['analyzed'])}")
        logger.info(f"Failed files: {len(results['failed'])}")
        logger.info(f"Skipped files: {len(results['skipped'])}")
        
        # Print recent issues found
        if results['analyzed']:
            logger.info("\nRecent issues found:")
            for result in results['analyzed']:
                if result['issues']:
                    logger.info(f"\nFile: {result['file_path']}")
                    for issue in result['issues']:
                        logger.info(f"- {issue['severity'].upper()}: {issue['description']}")
        
        # Print failures if any
        if results['failed']:
            logger.error("\nFailed files:")
            for failure in results['failed']:
                logger.error(f"- {failure['file']}: {failure.get('error', 'Unknown error')}")

        logger.info("\nDetailed report has been saved to the code_review_reports directory.")

    except Exception as e:
        logger.error(f"Fatal error in code review process: {str(e)}")
        raise

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
