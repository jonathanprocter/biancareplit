import os
import logging
import json
import sys
import time
from typing import Dict, Optional, List, Any, Union
from pathlib import Path
try:
    from openai import AsyncOpenAI, OpenAI
except ImportError:
    logging.error("OpenAI package not found. Please install it using: pip install openai")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CodeReviewService:
    def __init__(self):
        """Initialize the code review service"""
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not found in environment variables")

        try:
            if not self.api_key:
                logger.error("OpenAI API key is missing")
                raise ValueError("OpenAI API key is required")

            # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
            # do not change this unless explicitly requested by the user
            self.client = OpenAI(api_key=self.api_key)
            logger.info("OpenAI client initialized successfully")

            # Verify API key is valid by making a test call
            try:
                self.client.models.list()
                logger.info("OpenAI API key verified successfully")
            except Exception as api_error:
                logger.error(f"OpenAI API key verification failed: {str(api_error)}")
                raise ValueError("Invalid OpenAI API key") from api_error

        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            raise

        # Enhanced supported file extensions and their languages
        self.supported_languages = {
            # JavaScript ecosystem
            ".js": "JavaScript",
            ".ts": "TypeScript",
            ".tsx": "TypeScript React",
            ".jsx": "JavaScript React",
            ".vue": "Vue.js",
            ".svelte": "Svelte",
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
            ".json": "JSON",
            ".graphql": "GraphQL",
            # Documentation
            ".md": "Markdown",
            ".rst": "reStructuredText",
            # Configuration
            ".yaml": "YAML",
            ".yml": "YAML",
            ".toml": "TOML",
            ".ini": "INI",
            # Shell scripts
            ".sh": "Shell",
            ".bash": "Bash",
            ".zsh": "Zsh",
        }

    def review_file(self, file_path: Path) -> Dict[str, Any]:
        """Review a single file and return suggestions"""
        try:
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            extension = file_path.suffix
            language = self.supported_languages.get(extension)

            if not language:
                logger.warning(f"Unsupported file type: {extension}")
                return {"error": f"Unsupported file type: {extension}"}

            # Check file size before processing
            file_size = file_path.stat().st_size
            if file_size > 100 * 1024:  # 100KB limit
                logger.warning(f"File too large: {file_path} ({file_size / 1024:.1f}KB)")
                return {"error": "File too large for detailed review"}

            with open(file_path, "r", encoding="utf-8") as file:
                code = file.read().strip()

            if not code:
                logger.warning(f"Empty file: {file_path}")
                return {"error": "File is empty"}

            # Create comprehensive prompt for code review
            prompt = f"""Perform a thorough code review of this {language} code. Analyze for:
1. Code Quality:
   - Maintainability
   - Readability
   - Documentation
   - Naming conventions
2. Performance:
   - Time complexity
   - Space complexity
   - Resource usage
3. Security:
   - Vulnerabilities
   - Data handling
   - Input validation
4. Best Practices:
   - Design patterns
   - Error handling
   - Testing considerations
5. Technical Debt:
   - Code duplication
   - Complexity issues
   - Deprecated patterns

Return detailed JSON with the following structure:
{{
    "summary": {{
        "score": float,  // Overall quality score (0-10)
        "severity": "high/medium/low",
        "file_type": string,
        "loc": number,  // Lines of code
        "complexity": number  // Cyclomatic complexity estimate
    }},
    "issues": [{{
        "type": string,  // "security", "performance", "quality", "best-practice"
        "severity": "high/medium/low",
        "description": string,
        "line_numbers": [int],  // Affected lines
        "suggestion": string
    }}],
    "metrics": {{
        "maintainability": float,  // 0-10
        "testability": float,      // 0-10
        "security": float,         // 0-10
        "performance": float       // 0-10
    }},
    "recommendations": [string],  // List of actionable improvements
    "best_practices_followed": [string],  // List of good practices found
    "optimization_opportunities": [string]  // Potential improvements
}}

Code to review:
{code}
"""
            try:
                # Log start of code review
                logger.info(f"Starting code review for {file_path}")
                logger.info(f"File size: {file_path.stat().st_size / 1024:.2f}KB")

                start_time = time.time()
                response = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a focused code reviewer. Find only critical issues.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    response_format={"type": "json_object"},
                    max_tokens=500,  # Limit response size
                    timeout=60 #Added timeout to prevent indefinite hanging
                )
                end_time = time.time()
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

    def apply_fixes(self, file_path: Path, improved_code: str) -> bool:
        """Apply the suggested fixes to the file"""
        try:
            with open(file_path, "w", encoding="utf-8") as file:
                file.write(improved_code)
            logger.info(f"Successfully applied fixes to {file_path}")
            return True
        except Exception as e:
            logger.error(f"Error applying fixes to {file_path}: {str(e)}")
            return False

    def review_directory(self, directory: str) -> Dict[str, Union[Dict[str, Any], str]]:
        """Review all supported files in a directory recursively"""
        results = {}
        try:
            dir_path = Path(directory)
            if not dir_path.exists():
                raise FileNotFoundError(f"Directory not found: {directory}")

            files = list(dir_path.rglob("*"))
            file_stats = []
            total_size = 0

            for file in files:
                try:
                    if file.is_file():
                        stats = file.stat()
                        file_stats.append({
                            "file": str(file),
                            "size": stats.st_size,
                            "is_file": True
                        })
                        total_size += stats.st_size
                except Exception as e:
                    logger.warning(f"Could not stat file {file}: {str(e)}")
                    continue

            # Enhanced timeout calculation based on workload
            base_timeout = 60  # 60 seconds base
            time_per_file = 2  # 2 seconds per file
            time_per_mb = 5  # 5 seconds per MB
            # Additional time for larger codebases
            complexity_factor = 1 + (len(file_stats) / 1000)  # Scale up for larger projects
            calculated_timeout = int(
                (base_timeout +
                (len(file_stats) * time_per_file) +
                (total_size / (1024 * 1024) * time_per_mb)) * complexity_factor
            )
            total_timeout = min(calculated_timeout, 600)  # Max 10 minutes

            logger.info(f"Processing {len(file_stats)} files ({total_size / (1024 * 1024):.2f}MB) with {total_timeout}s timeout")
            logger.info(f"Complexity factor: {complexity_factor:.2f}")

            # Initialize progress tracking
            processed_count = 0
            total_files = len([f for f in files if f.is_file() and f.suffix in self.supported_languages])
            start_time = time.time()
            
            try:
                # Add try-except block for file processing
                try:
                    for file_path in files:
                        try:
                            if file_path.is_file() and file_path.suffix in self.supported_languages:
                                if not any(
                                    exclude in str(file_path)
                                    for exclude in ["node_modules", "__pycache__", "venv", ".git", "dist", "build"]
                                ):
                                    logger.info(f"Reviewing {file_path}")
                                    
                                    # Calculate and log progress metrics
                                    elapsed_time = time.time() - start_time
                                    files_per_second = processed_count / max(elapsed_time, 1)
                                    estimated_remaining = (total_files - processed_count) / max(files_per_second, 0.1)
                                    
                                    # Enhanced progress update
                                    progress_data = {
                                        "type": "progress",
                                        "data": {
                                            "processed": processed_count,
                                            "total": total_files,
                                            "current_file": str(file_path),
                                            "elapsed_time": round(elapsed_time, 2),
                                            "estimated_remaining": round(estimated_remaining, 2),
                                            "files_per_second": round(files_per_second, 2)
                                        }
                                    }
                                    print(json.dumps(progress_data))

                                    # Review file with timeout protection
                                    try:
                                        result = self.review_file(file_path)
                                        if result and "improved_code" in result:
                                            self.apply_fixes(file_path, result["improved_code"])
                                        results[str(file_path)] = result
                                    except Exception as review_error:
                                        logger.error(f"Error reviewing {file_path}: {str(review_error)}")
                                        results[str(file_path)] = {
                                            "error": f"Failed to review: {str(review_error)}",
                                            "type": "review_error"
                                        }
                                    
                                    processed_count += 1
                        except Exception as file_error:
                            logger.error(f"Error processing file {file_path}: {str(file_error)}")
                            continue

            except Exception as e:
                logger.error(f"An error occured during directory processing: {str(e)}")

            logger.info(f"Completed review of directory: {directory}")
            return results
        except Exception as e:
            error_msg = f"Error reviewing directory: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg}


def parse_args():
    """Parse command line arguments"""
    import argparse
    parser = argparse.ArgumentParser(description='Code Review Service')
    parser.add_argument('path', nargs='?', help='Path to file or directory to review')
    parser.add_argument('--format', choices=['json', 'text'], default='json',
                        help='Output format')
    parser.add_argument('--exclude', help='Comma-separated patterns to exclude')
    parser.add_argument('--include-only', help='Comma-separated patterns to include')
    parser.add_argument('--max-file-size', type=int, default=100,
                        help='Maximum file size in KB')
    parser.add_argument('--min-confidence', type=float, default=0.7,
                        help='Minimum confidence score for issues')
    parser.add_argument('--list-supported-types', action='store_true',
                        help='List supported file types')

    args = parser.parse_args()
    logger.info(f"Parsed arguments: {vars(args)}")
    return args


def main():
    """Main function to handle command line execution"""
    try:
        logger.info("Starting code review service")
        args = parse_args()

        try:
            service = CodeReviewService()
            logger.info("CodeReviewService initialized successfully")
        except Exception as init_error:
            logger.error(f"Failed to initialize CodeReviewService: {str(init_error)}")
            print(json.dumps({
                "error": "Service initialization failed",
                "details": str(init_error)
            }))
            sys.exit(1)

        if args.list_supported_types:
            logger.info("Listing supported file types")
            print(json.dumps({
                "success": True,
                "supportedTypes": service.supported_languages
            }))
            return

        if not args.path:
            logger.error("No path provided")
            print(json.dumps({
                "error": "Please provide a path",
                "success": False
            }))
            sys.exit(1)

        # Convert exclude and include patterns to lists
        exclude_patterns = args.exclude.split(',') if args.exclude else []
        include_patterns = args.include_only.split(',') if args.include_only else []

        logger.info(f"Processing path: {args.path}")
        logger.info(f"Exclude patterns: {exclude_patterns}")
        logger.info(f"Include patterns: {include_patterns}")

        path = Path(args.path)
        if not path.exists():
            logger.error(f"Path does not exist: {args.path}")
            print(json.dumps({
                "error": f"Path does not exist: {args.path}",
                "success": False
            }))
            sys.exit(1)

        logger.info(f"Reviewing {'file' if path.is_file() else 'directory'}: {args.path}")
        if path.is_file():
            results = service.review_file(path)
        else:
            results = service.review_directory(str(path))

        if args.format == 'json':
            logger.info("Outputting results in JSON format")
            print(json.dumps({
                "success": True,
                "results": results
            }))
        else:
            logger.info("Outputting results in text format")
            print(f"Code Review Results for {args.path}")
            print("=" * 50)
            if isinstance(results, dict) and 'error' in results:
                print(f"Error: {results['error']}")
            else:
                for file_path, review in results.items():
                    print(f"\nFile: {file_path}")
                    print("-" * 30)
                    if 'summary' in review:
                        print(f"Overall Score: {review['summary']['score']}/10")
                        print(f"Severity: {review['summary']['severity']}")
                        print(f"Lines of Code: {review['summary']['loc']}")
                    if 'issues' in review:
                        print("\nIssues Found:")
                        for issue in review['issues']:
                            print(f"- {issue['type']} ({issue['severity']})")
                            print(f"  {issue['description']}")
                            print(f"  Suggestion: {issue['suggestion']}")
                    print("\n")

    except Exception as e:
        logger.error(f"Unhandled error in main: {str(e)}")
        print(json.dumps({
            "success": False,
            "error": str(e),
            "type": "unhandled_error"
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()