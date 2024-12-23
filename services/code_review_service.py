#!/usr/bin/env python3
"""Code review service using OpenAI's GPT-4 model."""
import os
import logging
import json
import sys
from typing import Dict, Any
from pathlib import Path
import asyncio
from openai import OpenAI, OpenAIError
import time

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
            self.api_key = os.getenv("OPENAI_API_KEY")
            if not self.api_key:
                raise ValueError("OPENAI_API_KEY not found in environment variables")

            # Initialize OpenAI client with configuration
            self.client = OpenAI(
                api_key=self.api_key,
                timeout=60.0,  # API timeout
                max_retries=2  # Retry failed requests
            )
            
            # Verify API connection
            self.client.models.list()
            logger.info("OpenAI client initialized and verified successfully")

            # Initialize rate limiting and configuration
            self.last_api_call = 0
            self.min_delay = 1.0  # Minimum delay between API calls in seconds
            self.batch_size = 5   # Number of files to process in parallel
            self.api_timeout = 60  # API call timeout in seconds
            
        except OpenAIError as api_err:
            logger.error(f"OpenAI API Error: {str(api_err)}")
            raise
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
            
            if not file_path.exists():
                logger.error(f"File not found: {file_path}")
                return {
                    "status": "error",
                    "error": f"File not found: {file_path}",
                    "file": str(file_path)
                }

            extension = file_path.suffix.lower()
            language = self.supported_languages.get(extension)
            if not language:
                logger.warning(f"Unsupported file type: {extension} for {file_path}")
                return {
                    "status": "skipped",
                    "error": f"Unsupported file type: {extension}",
                    "file": str(file_path)
                }

            # Check file size
            file_size = file_path.stat().st_size
            size_limit = 100 * 1024  # 100KB limit
            if file_size > size_limit:
                logger.warning(f"File too large: {file_path} ({file_size/1024:.1f}KB)")
                return {
                    "status": "skipped",
                    "error": f"File too large (limit: {size_limit/1024:.0f}KB)",
                    "file": str(file_path),
                    "file_size": file_size
                }

            try:
                with open(file_path, "r", encoding="utf-8") as file:
                    code = file.read().strip()
            except UnicodeDecodeError:
                logger.error(f"Failed to read file {file_path}: Unicode decode error")
                return {
                    "status": "error",
                    "error": "File encoding not supported",
                    "file": str(file_path)
                }

            if not code:
                logger.warning(f"Empty file: {file_path}")
                return {
                    "status": "skipped",
                    "error": "File is empty",
                    "file": str(file_path)
                }
            
            logger.info(f"Successfully loaded file: {file_path} ({len(code)} bytes)")

            prompt = f"""Perform a comprehensive code review of this {language} code. Focus on:
1. Code Quality
   - Maintainability and readability
   - Best practices and patterns
   - Documentation completeness
2. Security
   - Input validation
   - Authentication/authorization
   - Data protection
3. Performance
   - Algorithmic efficiency
   - Resource usage
   - Optimization opportunities
4. Testing
   - Test coverage
   - Error handling
   - Edge cases

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
            try:
                # Implement rate limiting
                now = time.time()
                if now - self.last_api_call < self.min_delay:
                    wait_time = self.min_delay - (now - self.last_api_call)
                    logger.info(f"Rate limiting: waiting {wait_time:.2f}s")
                    time.sleep(wait_time)

                start_time = time.time()
                logger.info(f"Starting code review for {file_path}")
                
                # Implement rate limiting
                current_time = time.time()
                if current_time - self.last_api_call < self.min_delay:
                    wait_time = self.min_delay - (current_time - self.last_api_call)
                    logger.info(f"Rate limiting: waiting {wait_time:.2f}s")
                    time.sleep(wait_time)

                logger.info("Making OpenAI API request...")
                try:
                    response = self.client.chat.completions.create(
                        model="gpt-4",  # Using standard GPT-4 for better compatibility
                        messages=[
                            {
                                "role": "system",
                                "content": "You are an expert code reviewer. Analyze the code and provide a detailed review in JSON format. Include a summary with score (0-10), severity level, and key recommendations. Also list specific issues found with their type, severity, description, and suggested fixes."
                            },
                            {"role": "user", "content": prompt}
                        ],
                        max_tokens=2000,
                        temperature=0.1,
                        timeout=self.api_timeout
                    )
                    self.last_api_call = time.time()
                    logger.info("OpenAI API request completed successfully")
                except Exception as e:
                    logger.error(f"OpenAI API request failed: {str(e)}")
                    raise
                end_time = time.time()
                self.last_api_call = end_time
                logger.info(f"Review completed in {end_time-start_time:.2f}s")

                result = json.loads(response.choices[0].message.content)
                return {
                    "status": "success",
                    "file": str(file_path),
                    "review": result
                }

            except json.JSONDecodeError as json_err:
                logger.error(f"Failed to parse OpenAI response: {json_err}")
                return {
                    "status": "error",
                    "error": "Invalid response format",
                    "details": str(json_err),
                    "file": str(file_path)
                }

            except OpenAIError as api_err:
                logger.error(f"OpenAI API error: {api_err}")
                return {
                    "status": "error",
                    "error": "Failed to analyze code",
                    "details": str(api_err),
                    "file": str(file_path)
                }

        except Exception as e:
            logger.error(f"Error reviewing file {file_path}: {e}")
            return {
                "status": "error",
                "error": str(e),
                "file": str(file_path)
            }

    async def review_file_async(self, file_path: Path, results, stats):
        """Asynchronously review a single file."""
        try:
            logger.info(f"Starting review of {file_path}")

            # Skip files that are too large or empty early
            file_size = file_path.stat().st_size
            if file_size > 100 * 1024:  # 100KB
                logger.warning(f"Skipping large file: {file_path} ({file_size/1024:.1f}KB)")
                stats["skipped"] += 1
                return

            if file_size == 0:
                logger.warning(f"Skipping empty file: {file_path}")
                stats["skipped"] += 1
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
            results[str(file_path)] = {
                "status": "error",
                "error": str(e),
                "file": str(file_path)
            }
            stats["errors"] += 1

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

            # Define exclusions
            exclude_dirs = {
                '.git', 'node_modules', 'venv', '__pycache__',
                'migrations', 'dist', 'build', 'coverage',
                '.pytest_cache', '__snapshots__', '.next'
            }
            exclude_files = {
                'package-lock.json', 'yarn.lock', '*.pyc',
                '*.map', '*.min.js', '*.min.css',
                '.DS_Store', 'Thumbs.db', '*.log'
            }

            # Collect files to process
            files_to_process = []
            for root, dirs, files in os.walk(directory):
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
                # Process files in batches to avoid rate limits
                total_batches = (len(files_to_process) + self.batch_size - 1) // self.batch_size

                for batch_num, i in enumerate(range(0, len(files_to_process), self.batch_size)):
                    batch = files_to_process[i:i + self.batch_size]
                    batch_start_time = time.time()

                    logger.info(f"\nProcessing batch {batch_num + 1}/{total_batches}")
                    logger.info(f"Files in batch: {len(batch)}")

                    tasks = []
                    for file_path in batch:
                        # Add small delay between task creation to prevent API rate limiting
                        if tasks:
                            await asyncio.sleep(0.1)
                        tasks.append(self.review_file_async(file_path, results["files"], results["stats"]))

                    try:
                        await asyncio.gather(*tasks)
                        batch_duration = time.time() - batch_start_time

                        # Calculate and log progress
                        processed = i + len(batch)
                        progress = (processed / len(files_to_process)) * 100
                        remaining = len(files_to_process) - processed

                        logger.info(f"Progress: {progress:.1f}% ({processed}/{len(files_to_process)} files)")
                        logger.info(f"Batch completed in {batch_duration:.1f}s")
                        logger.info(f"Remaining files: {remaining}")

                        # Add delay between batches if not the last batch
                        if batch_num < total_batches - 1:
                            await asyncio.sleep(1)

                    except Exception as batch_error:
                        logger.error(f"Error in batch {batch_num + 1}: {str(batch_error)}")
                        results["stats"]["errors"] += 1
                        # Continue with next batch instead of failing completely
                        continue

            try:
                asyncio.run(process_files())
                results["status"] = "completed"
                results["stats"]["end_time"] = time.time()
                duration = results["stats"]["end_time"] - results["stats"]["start_time"]
                logger.info(f"Review completed in {duration:.1f} seconds")
            except Exception as e:
                logger.error(f"Failed to process files: {str(e)}")
                results["status"] = "failed"
                results["error"] = str(e)

            return results

        except Exception as e:
            error_msg = f"Error processing directory: {str(e)}"
            logger.error(error_msg)
            results["status"] = "failed"
            results["error"] = error_msg
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
        print(json.dumps({
            "success": False,
            "error": "Please provide a path to review"
        }, indent=2))
        sys.exit(1)

    try:
        service = CodeReviewService()
        path = Path(args.path)

        if not path.exists():
            print(json.dumps({
                "success": False,
                "error": f"Path does not exist: {args.path}"
            }, indent=2))
            sys.exit(1)

        logger.info(f"Starting review for: {path}")
        start_time = time.time()

        results = service.review_file(path) if path.is_file() else service.process_directory(str(path))

        end_time = time.time()
        duration = round(end_time - start_time, 2)

        if args.format == 'json':
            print(json.dumps({
                "success": True,
                "results": results,
                "execution_time": duration
            }, indent=2))
        else:
            print(f"Code Review Results for {args.path}")
            print("=" * 50)
            print(f"Execution time: {duration} seconds\n")

            if results.get("status") == "error":
                print(f"Error: {results['error']}")
            elif path.is_file():
                review = results.get("review", {})
                if "summary" in review:
                    print(f"Score: {review['summary']['score']}/10")
                    print(f"Severity: {review['summary']['severity']}")
                    print("\nRecommendations:")
                    for rec in review['summary']['recommendations']:
                        print(f"- {rec}")
                if "issues" in review:
                    print("\nIssues:")
                    for issue in review['issues']:
                        print(f"\n[{issue['severity']}] {issue['type']}")
                        print(f"Description: {issue['description']}")
                        print(f"Suggestion: {issue['suggestion']}")
                        if 'line_number' in issue:
                            print(f"Line: {issue['line_number']}")
            else:
                for file_path, file_results in results.get("files", {}).items():
                    if file_results.get("status") == "success":
                        review = file_results.get("review", {})
                        print(f"\nFile: {file_path}")
                        print("-" * 30)
                        if "summary" in review:
                            print(f"Score: {review['summary']['score']}/10")
                            print(f"Severity: {review['summary']['severity']}")
                            print("\nRecommendations:")
                            for rec in review['summary']['recommendations']:
                                print(f"- {rec}")
                        if "issues" in review:
                            print("\nIssues:")
                            for issue in review['issues']:
                                print(f"\n[{issue['severity']}] {issue['type']}")
                                print(f"Description: {issue['description']}")
                                print(f"Suggestion: {issue['suggestion']}")
                                if 'line_number' in issue:
                                    print(f"Line: {issue['line_number']}")

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()