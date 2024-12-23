#!/usr/bin/env python3
"""Code review service using OpenAI's GPT-4 model."""
import os
import logging
import json
import sys
import time
from typing import Dict, Any
from pathlib import Path
import asyncio
try:
    from openai import OpenAI
except ImportError:
    logging.error("OpenAI package not found. Please install it using: pip install openai")
    sys.exit(1)

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
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")

        try:
            self.client = OpenAI(api_key=self.api_key)
            self.last_api_call = 0
            self.min_delay = 1.0  # Minimum delay between API calls in seconds
            self.batch_size = 5   # Number of files to process in parallel
            self.api_timeout = 60  # API call timeout in seconds
            logger.info("OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            raise

        # Initialize rate limiting state
        self._rate_limit_remaining = 3000  # Default RPM limit
        self._rate_limit_reset = time.time() + 60

        self.supported_languages = {
            # JavaScript/TypeScript ecosystem
            ".js": "JavaScript",
            ".ts": "TypeScript",
            ".tsx": "TypeScript React",
            ".jsx": "JavaScript React",
            ".vue": "Vue.js",
            ".svelte": "Svelte",
            ".mjs": "JavaScript Module",
            ".cjs": "CommonJS Module",
            # Python ecosystem
            ".py": "Python",
            ".pyi": "Python Interface",
            ".pyx": "Cython",
            # Web technologies
            ".css": "CSS",
            ".scss": "SCSS",
            ".sass": "Sass",
            ".less": "Less",
            ".html": "HTML",
            ".htm": "HTML",
            ".json": "JSON",
            ".graphql": "GraphQL",
            ".gql": "GraphQL",
            # Documentation
            ".md": "Markdown",
            ".rst": "reStructuredText",
            ".txt": "Text",
            # Configuration
            ".yaml": "YAML",
            ".yml": "YAML",
            ".toml": "TOML",
            ".ini": "INI",
            ".env": "Environment",
            # Database
            ".sql": "SQL",
        }

    def review_file(self, file_path: Path) -> Dict[str, Any]:
        """Review a single file and return suggestions."""
        try:
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            extension = file_path.suffix.lower()
            language = self.supported_languages.get(extension)

            if not language:
                logger.warning(f"Unsupported file type: {extension}")
                return {
                    "status": "skipped",
                    "error": f"Unsupported file type: {extension}",
                    "file": str(file_path)
                }

            # Check file size before processing
            file_size = file_path.stat().st_size
            size_limit = 100 * 1024  # 100KB limit
            if file_size > size_limit:
                logger.warning(f"File too large: {file_path} ({file_size / 1024:.1f}KB)")
                return {
                    "status": "skipped",
                    "error": f"File too large for detailed review (limit: {size_limit/1024:.0f}KB)",
                    "file": str(file_path),
                    "file_size": file_size
                }

            with open(file_path, "r", encoding="utf-8") as file:
                code = file.read().strip()

            if not code:
                logger.warning(f"Empty file: {file_path}")
                return {
                    "status": "skipped",
                    "error": "File is empty",
                    "file": str(file_path)
                }

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
                    logger.info(f"Rate limiting: waiting {wait_time:.2f}s before next API call")
                    time.sleep(wait_time)
                
                start_time = time.time()
                response = self.client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a focused code reviewer. Analyze the code and return ONLY a valid JSON response containing your findings.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    max_tokens=2000,
                    temperature=0.1,
                    timeout=self.api_timeout
                )
                end_time = time.time()
                self.last_api_call = end_time
                logger.info(f"Code review completed in {end_time-start_time:.2f} seconds")
                
                result = json.loads(response.choices[0].message.content)
                logger.info(f"Successfully reviewed {file_path}")
                return result

            except json.JSONDecodeError as json_err:
                error_msg = f"Failed to parse OpenAI response: {str(json_err)}"
                logger.error(error_msg)
                return {
                    "error": "Invalid response format",
                    "details": error_msg
                }

            except Exception as api_error:
                error_msg = f"OpenAI API error for {file_path}: {str(api_error)}"
                logger.error(error_msg)
                return {
                    "error": "Failed to analyze code",
                    "details": error_msg
                }

        except Exception as e:
            error_msg = f"Error reviewing file {file_path}: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg}

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
            
            if "error" in review_result:
                stats["errors"] += 1
                logger.error(f"Review failed for {file_path}: {review_result['error']}")
            else:
                logger.info(f"Successfully reviewed {file_path} in {duration:.1f}s")
            
        except Exception as e:
            logger.error(f"Error processing {file_path}: {str(e)}")
            results[str(file_path)] = {
                "error": str(e),
                "status": "failed"
            }
            stats["errors"] += 1
            stats["skipped"] += 1

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
                "start_time": time.time(),
            }
        }

        try:
            dir_path = Path(directory)
            if not dir_path.exists():
                raise FileNotFoundError(f"Directory not found: {directory}")

            # Directories to exclude
            exclude_dirs = {
                '.git', 'node_modules', 'venv', '__pycache__',
                'migrations', 'dist', 'build', 'coverage',
                '.pytest_cache', '__snapshots__', '.next'
            }

            # Files to exclude
            exclude_files = {
                'package-lock.json', 'yarn.lock', '*.pyc',
                '*.map', '*.min.js', '*.min.css',
                '.DS_Store', 'Thumbs.db', '*.log'
            }

            # Collect all eligible files first
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

    parser = argparse.ArgumentParser(description='Code Review Service')
    parser.add_argument('path', nargs='?', help='Path to file or directory to review')
    parser.add_argument('--format', choices=['json', 'text'], default='json',
                      help='Output format')
    parser.add_argument('--list-supported-types', action='store_true',
                      help='List supported file types')
    args = parser.parse_args()

    try:
        service = CodeReviewService()

        if args.list_supported_types:
            print(json.dumps({
                "success": True,
                "supportedTypes": service.supported_languages
            }, indent=2))
            return

        if not args.path:
            print(json.dumps({
                "error": "Please provide a path",
                "success": False
            }, indent=2))
            sys.exit(1)

        path = Path(args.path)
        if not path.exists():
            print(json.dumps({
                "error": f"Path does not exist: {args.path}",
                "success": False
            }, indent=2))
            sys.exit(1)

        start_time = time.time()
        if path.is_file():
            results = service.review_file(path)
        else:
            results = service.process_directory(str(path))
        end_time = time.time()

        if args.format == 'json':
            print(json.dumps({
                "success": True,
                "results": results,
                "execution_time": round(end_time - start_time, 2)
            }, indent=2))
        else:
            print(f"Code Review Results for {args.path}")
            print("=" * 50)
            print(f"Execution time: {round(end_time - start_time, 2)} seconds\n")
            
            if isinstance(results, dict) and 'error' in results:
                print(f"Error: {results['error']}")
            else:
                for file_path, review in results.items():
                    print(f"\nFile: {file_path}")
                    print("-" * 30)
                    if 'summary' in review:
                        print(f"Score: {review['summary']['score']}/10")
                        print(f"Severity: {review['summary']['severity']}")
                        if 'recommendations' in review['summary']:
                            print("\nRecommendations:")
                            for rec in review['summary']['recommendations']:
                                print(f"- {rec}")
                    if 'issues' in review:
                        print("\nIssues:")
                        for issue in review['issues']:
                            print(f"- [{issue['severity']}] {issue['type']}")
                            print(f"  {issue['description']}")
                            print(f"  Suggestion: {issue['suggestion']}")
                    print()

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
