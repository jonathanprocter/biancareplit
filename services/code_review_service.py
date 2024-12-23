#!/usr/bin/env python3
"""Code review service using OpenAI's GPT-4 model."""
import os
import logging
import json
import sys
from typing import Dict, Any, List, Optional
from pathlib import Path
import time
import asyncio
from openai import OpenAI
from openai.types.error import OpenAIError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CodeReviewService:
    """Service for automated code review using OpenAI's GPT-4."""

    def __init__(self):
        """Initialize the code review service."""
        try:
            # Verify API key presence
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is not set")

            # Initialize OpenAI client with configuration
            self.client = OpenAI(
                api_key=api_key,
                timeout=60.0,
                max_retries=2
            )
            
            # Test API connectivity
            try:
                self.client.models.list()
                logger.info("OpenAI API connection verified successfully")
            except Exception as api_err:
                raise ValueError(f"Failed to connect to OpenAI API: {str(api_err)}")

            # Initialize rate limiting and configuration
            self.last_api_call = 0
            self.min_delay = 1.0  # Minimum delay between API calls
            self.batch_size = 5   # Files per batch
            self.max_file_size = 100 * 1024  # 100KB limit
            self.api_timeout = 60.0  # API timeout in seconds

        except Exception as e:
            logger.error(f"Failed to initialize code review service: {str(e)}")
            raise

        self.supported_languages = {
            # JavaScript/TypeScript ecosystem
            ".js": "JavaScript",
            ".ts": "TypeScript",
            ".tsx": "TypeScript React",
            ".jsx": "JavaScript React",
            ".vue": "Vue.js",
            ".mjs": "JavaScript Module",
            ".cjs": "CommonJS Module",
            # Python ecosystem
            ".py": "Python",
            ".pyi": "Python Interface",
            # Web technologies
            ".css": "CSS",
            ".scss": "SCSS",
            ".html": "HTML",
            ".json": "JSON",
            # Documentation
            ".md": "Markdown",
            ".txt": "Text",
            # Configuration
            ".yaml": "YAML",
            ".yml": "YAML",
            ".env": "Environment",
            ".svelte": "Svelte",
            ".sass": "Sass",
            ".less": "Less",
            ".htm": "HTML",
            ".graphql": "GraphQL",
            ".gql": "GraphQL",
            ".py": "Python",
            ".pyi": "Python Interface",
            ".pyx": "Cython",
            ".sql": "SQL",

        }

    def review_file(self, file_path: Path) -> Dict[str, Any]:
        """Review a single file and return suggestions."""
        try:
            logger.info(f"Starting review for file: {file_path}")
            
            # Basic file validation
            if not self._validate_file(file_path):
                return {
                    "status": "skipped",
                    "error": "File validation failed",
                    "file": str(file_path)
                }

            # Read file content
            code = self._read_file_content(file_path)
            if not code:
                return {
                    "status": "skipped",
                    "error": "Empty or unreadable file",
                    "file": str(file_path)
                }
            
            # Get language for file
            language = self.supported_languages.get(file_path.suffix.lower(), "text")
            
            prompt = self._create_review_prompt(language, code)
            review_result = self._get_review_from_openai(prompt)
            
            if review_result:
                return {
                    "status": "success",
                    "file": str(file_path),
                    "review": review_result
                }
            else:
                return {
                    "status": "error",
                    "error": "Failed to get review results",
                    "file": str(file_path)
                }

        except Exception as e:
            logger.error(f"Error reviewing file {file_path}: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "file": str(file_path)
            }

    def _validate_file(self, file_path: Path) -> bool:
        """Validate if file is reviewable."""
        try:
            if not file_path.exists():
                logger.error(f"File not found: {file_path}")
                return False

            if not file_path.suffix.lower() in self.supported_languages:
                logger.warning(f"Unsupported file type: {file_path.suffix}")
                return False

            file_size = file_path.stat().st_size
            if file_size > self.max_file_size:
                logger.warning(f"File too large: {file_path} ({file_size/1024:.1f}KB)")
                return False

            return True
        except Exception as e:
            logger.error(f"File validation error: {str(e)}")
            return False

    def _read_file_content(self, file_path: Path) -> Optional[str]:
        """Read and validate file content."""
        try:
            with open(file_path, "r", encoding="utf-8") as file:
                content = file.read().strip()
                return content if content else None
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {str(e)}")
            return None

    def _create_review_prompt(self, language: str, code: str) -> str:
        """Create the review prompt for OpenAI."""
        return f"""Review this {language} code focusing on:
1. Code Quality (maintainability, readability, best practices)
2. Security (input validation, auth, data protection)
3. Performance (efficiency, resource usage, optimization)
4. Testing (coverage, error handling, edge cases)

Return JSON with:
{{
    "summary": {{
        "score": float,  // Overall quality score (0-10)
        "severity": string,  // critical/high/medium/low/none
        "recommendations": [string]  // Key recommendations
    }},
    "issues": [
        {{
            "type": string,  // Category of issue
            "severity": string,  // critical/high/medium/low
            "description": string,
            "suggestion": string,
            "line_number": number  // Optional
        }}
    ]
}}

Code to review:
{code}
"""

    def _get_review_from_openai(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Get code review from OpenAI API."""
        try:
            # Rate limiting
            now = time.time()
            if now - self.last_api_call < self.min_delay:
                wait_time = self.min_delay - (now - self.last_api_call)
                logger.info(f"Rate limiting: waiting {wait_time:.2f}s")
                time.sleep(wait_time)

            start_time = time.time()
            logger.info("Making OpenAI API request...")

            try:
                response = self.client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert code reviewer. Analyze the code and provide a detailed review in JSON format focusing on code quality, security, performance, and testing aspects."
                        },
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=2000,
                    temperature=0.1,
                    timeout=self.api_timeout,
                    request_timeout=self.api_timeout
                )
                
                self.last_api_call = time.time()
                duration = time.time() - start_time
                logger.info(f"OpenAI API request completed in {duration:.2f}s")

                if not response.choices:
                    logger.error("OpenAI API returned empty response")
                    return None

                try:
                    result = json.loads(response.choices[0].message.content)
                    # Validate response structure
                    if not isinstance(result, dict) or 'summary' not in result or 'issues' not in result:
                        logger.error("Invalid response structure from OpenAI")
                        return None
                    return result
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse OpenAI response: {str(e)}")
                    return None

            except OpenAIError as e:
                logger.error(f"OpenAI API error: {str(e)}")
                return None
            except Exception as e:
                logger.error(f"Error during API request: {str(e)}")
                return None

        except Exception as e:
            logger.error(f"Unexpected error in code review: {str(e)}")
            return None


    async def review_file_async(self, file_path: Path, results: Dict[str, Any], stats: Dict[str, int]) -> None:
        """Asynchronously review a single file."""
        try:
            logger.info(f"Starting review of {file_path}")

            # Basic file validation
            if not self._validate_file(file_path):
                logger.warning(f"Skipping file due to validation: {file_path}")
                stats["skipped"] += 1
                results[str(file_path)] = {
                    "status": "skipped",
                    "error": "File validation failed",
                    "file": str(file_path)
                }
                return

            # Perform the review
            start_time = time.time()
            review_result = self.review_file(file_path)
            duration = time.time() - start_time

            # Update results and stats
            results[str(file_path)] = review_result
            stats["processed"] += 1

            if review_result.get("status") == "error":
                stats["errors"] += 1
                logger.error(f"Review failed for {file_path}: {review_result.get('error')}")
            else:
                logger.info(f"Successfully reviewed {file_path} in {duration:.1f}s")

        except Exception as e:
            logger.error(f"Error processing {file_path}: {str(e)}")
            stats["errors"] += 1
            results[str(file_path)] = {
                "status": "error",
                "error": str(e),
                "file": str(file_path)
            }

    def process_directory(self, directory: str) -> Dict[str, Any]:
        """Process all supported files in the directory recursively."""
        results = {
            "status": "in_progress",
            "files": {},
            "stats": {
                "processed": 0,
                "skipped": 0,
                "errors": 0,
                "total_files": 0,
                "start_time": time.time()
            }
        }

        try:
            dir_path = Path(directory)
            if not dir_path.exists():
                raise FileNotFoundError(f"Directory not found: {directory}")

            # Define exclusions for better efficiency
            exclude_dirs = {
                '.git', 'node_modules', 'venv', '__pycache__',
                'migrations', 'dist', 'build', 'coverage'
            }
            exclude_files = {
                'package-lock.json', 'yarn.lock', '*.pyc',
                '*.map', '*.min.js', '*.min.css'
            }

            # Collect files to process
            files_to_process = []
            for root, dirs, files in os.walk(directory):
                # Modify dirs in place to skip excluded directories
                dirs[:] = [d for d in dirs if d not in exclude_dirs]
                
                for file_name in files:
                    if any(file_name.endswith(exc) for exc in exclude_files):
                        continue
                    
                    file_path = Path(os.path.join(root, file_name))
                    if file_path.suffix.lower() in self.supported_languages:
                        files_to_process.append(file_path)

            results["stats"]["total_files"] = len(files_to_process)
            logger.info(f"Found {len(files_to_process)} files to process")

            async def process_files():
                total_batches = (len(files_to_process) + self.batch_size - 1) // self.batch_size

                for batch_num, i in enumerate(range(0, len(files_to_process), self.batch_size)):
                    batch = files_to_process[i:i + self.batch_size]
                    batch_start_time = time.time()

                    logger.info(f"\nProcessing batch {batch_num + 1}/{total_batches}")
                    
                    tasks = []
                    for file_path in batch:
                        tasks.append(self.review_file_async(file_path, results["files"], results["stats"]))

                    try:
                        await asyncio.gather(*tasks)
                        batch_duration = time.time() - batch_start_time
                        processed = i + len(batch)
                        
                        logger.info(f"Batch {batch_num + 1} completed in {batch_duration:.1f}s")
                        logger.info(f"Progress: {(processed/len(files_to_process))*100:.1f}%")

                        if batch_num < total_batches - 1:
                            await asyncio.sleep(1)  # Rate limiting between batches

                    except Exception as batch_error:
                        logger.error(f"Error in batch {batch_num + 1}: {str(batch_error)}")
                        results["stats"]["errors"] += 1
                        continue

            # Run the async processing
            asyncio.run(process_files())
            
            # Update final statistics
            results["status"] = "completed"
            results["stats"]["end_time"] = time.time()
            duration = results["stats"]["end_time"] - results["stats"]["start_time"]
            
            logger.info(f"\nReview completed in {duration:.1f} seconds")
            logger.info(f"Files processed: {results['stats']['processed']}")
            logger.info(f"Files skipped: {results['stats']['skipped']}")
            logger.info(f"Errors encountered: {results['stats']['errors']}")

            return results

        except Exception as e:
            logger.error(f"Error processing directory: {str(e)}")
            results["status"] = "failed"
            results["error"] = str(e)
            return results

def main():
    """Main function to handle command line execution."""
    import argparse
    import time

    parser = argparse.ArgumentParser(description='Code Review Service')
    parser.add_argument('path', nargs='?', help='Path to file/directory to review')
    parser.add_argument('--format', choices=['json', 'text'], default='json',
                      help='Output format')
    args = parser.parse_args()

    if not args.path:
        logger.error("No path provided for review")
        print(json.dumps({
            "success": False,
            "error": "Please provide a path to review"
        }, indent=2))
        sys.exit(1)

    try:
        # First verify OpenAI API key
        if not os.getenv("OPENAI_API_KEY"):
            logger.error("OPENAI_API_KEY environment variable not set")
            print(json.dumps({
                "success": False,
                "error": "OPENAI_API_KEY environment variable must be set"
            }, indent=2))
            sys.exit(1)

        # Initialize service
        try:
            service = CodeReviewService()
        except Exception as init_error:
            logger.error(f"Failed to initialize code review service: {str(init_error)}")
            print(json.dumps({
                "success": False,
                "error": f"Service initialization failed: {str(init_error)}"
            }, indent=2))
            sys.exit(1)

        # Validate path
        path = Path(args.path)
        if not path.exists():
            logger.error(f"Path does not exist: {args.path}")
            print(json.dumps({
                "success": False,
                "error": f"Path does not exist: {args.path}"
            }, indent=2))
            sys.exit(1)

        # Start review process
        logger.info(f"Starting code review for: {path}")
        start_time = time.time()

        try:
            if path.is_file():
                logger.info(f"Processing single file: {path}")
                results = service.review_file(path)
            else:
                logger.info(f"Processing directory: {path}")
                results = service.process_directory(str(path))

            # Calculate execution time
            duration = round(time.time() - start_time, 2)
            logger.info(f"Review completed in {duration} seconds")

            # Prepare output
            output = {
                "success": True,
                "results": results,
                "execution_time": duration,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }

            # Output results based on format
            if args.format == 'json':
                print(json.dumps(output, indent=2))
            else:
                _print_text_format(args.path, results, duration)

        except Exception as review_error:
            error_msg = f"Review process failed: {str(review_error)}"
            logger.error(error_msg)
            print(json.dumps({
                "success": False,
                "error": error_msg,
                "path": str(path)
            }, indent=2))
            sys.exit(1)

    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg)
        print(json.dumps({
            "success": False,
            "error": error_msg
        }, indent=2))
        sys.exit(1)

def _print_text_format(path: str, results: dict, duration: float) -> None:
    """Print results in text format."""
    print(f"\nCode Review Results for {path}")
    print("=" * 50)
    print(f"Execution time: {duration} seconds\n")

    if isinstance(results, dict):
        if results.get("status") == "error":
            print(f"Error: {results.get('error', 'Unknown error')}")
            return

        if "files" in results:
            # Directory review results
            stats = results.get("stats", {})
            print(f"Files processed: {stats.get('processed', 0)}")
            print(f"Files skipped: {stats.get('skipped', 0)}")
            print(f"Errors encountered: {stats.get('errors', 0)}\n")

            for file_path, file_results in results.get("files", {}).items():
                if file_results.get("status") == "success":
                    _print_file_review(file_path, file_results.get("review", {}))
        else:
            # Single file review results
            _print_file_review(path, results.get("review", {}))

def _print_file_review(file_path: str, review: dict) -> None:
    """Print review results for a single file."""
    if not isinstance(review, dict):
        return

    print(f"\nFile: {file_path}")
    print("-" * 30)

    if "summary" in review:
        summary = review["summary"]
        print(f"Score: {summary.get('score', 'N/A')}/10")
        print(f"Severity: {summary.get('severity', 'N/A')}")
        
        if "recommendations" in summary:
            print("\nRecommendations:")
            for rec in summary["recommendations"]:
                print(f"- {rec}")

    if "issues" in review:
        print("\nIssues:")
        for issue in review["issues"]:
            print(f"\n[{issue.get('severity', 'unknown')}] {issue.get('type', 'unknown')}")
            print(f"Description: {issue.get('description', 'No description')}")
            print(f"Suggestion: {issue.get('suggestion', 'No suggestion')}")
            if "line_number" in issue:
                print(f"Line: {issue['line_number']}")

if __name__ == "__main__":
    main()