"""Code review and automated fixing system for the codebase."""

import asyncio
import logging
import os
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Optional

import aiohttp
import backoff

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
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


class CodeReviewSystem:
    """Manages code review and automated fixing."""

    def __init__(self):
        """Initialize the code review system."""
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")

        self.headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json",
        }
        self.session = None
        self.rate_limit_remaining = 50  # Initial rate limit assumption
        self.rate_limit_reset = 0

    async def __aenter__(self):
        """Setup async context."""
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Cleanup async context."""
        if self.session:
            await self.session.close()

    @staticmethod
    def detect_language(file_path: str) -> Optional[str]:
        """Detect the programming language based on file extension."""
        _, ext = os.path.splitext(file_path)
        return SUPPORTED_LANGUAGES.get(ext)

    @backoff.on_exception(
        backoff.expo, (aiohttp.ClientError, asyncio.TimeoutError), max_tries=5
    )
    async def fix_code(self, file_path: str, language: str) -> Optional[str]:
        """Review and fix code using OpenAI API with improved error handling."""
        if not self.session:
            self.session = aiohttp.ClientSession()

        try:
            with open(file_path, "r", encoding="utf-8") as file:
                code_content = file.read()

            # Check rate limits
            if self.rate_limit_remaining <= 0:
                wait_time = max(0, self.rate_limit_reset - int(time.time()))
                if wait_time > 0:
                    logger.info(f"Rate limit reached. Waiting {wait_time} seconds...")
                    await asyncio.sleep(wait_time)

            prompt = f"""
            You are a code fixing expert. Analyze this {language} code and provide the complete fixed version that:
            1. Fixes any syntax errors and bugs
            2. Addresses security vulnerabilities
            3. Improves performance issues
            4. Ensures proper integration
            5. Follows best practices and style guidelines

            Return ONLY the complete fixed code without any explanations:

            {code_content}
            """

            async with self.session.post(
                "https://api.openai.com/v1/chat/completions",
                headers=self.headers,
                json={
                    "model": "gpt-4",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                },
                timeout=60,
            ) as response:
                # Update rate limits from headers
                self.rate_limit_remaining = int(
                    response.headers.get("x-ratelimit-remaining", 50)
                )
                self.rate_limit_reset = int(
                    response.headers.get("x-ratelimit-reset", 0)
                )

                if response.status == 200:
                    data = await response.json()
                    fixed_code = data["choices"][0]["message"]["content"]
                    logger.info(f"Successfully fixed {file_path}")
                    return fixed_code
                if response.status == 429:  # Rate limit exceeded
                    retry_after = int(response.headers.get("retry-after", 60))
                    logger.warning(
                        f"Rate limit exceeded. Waiting {retry_after} seconds..."
                    )
                    await asyncio.sleep(retry_after)
                    return await self.fix_code(file_path, language)
                logger.error(f"API error: {response.status} - {await response.text()}")
                return None

        except Exception as e:
            logger.error(f"Error fixing {file_path}: {str(e)}")
            return None

    @staticmethod
    def apply_linters(file_path: str, language: str) -> bool:
        """Apply language-specific linters and formatters."""
        try:
            if language == "Python":
                subprocess.run(["black", file_path], check=True, capture_output=True)
                subprocess.run(["flake8", file_path], check=True, capture_output=True)
            elif language in ["JavaScript", "TypeScript"]:
                subprocess.run(
                    ["npx", "eslint", "--fix", file_path],
                    check=True,
                    capture_output=True,
                )
                subprocess.run(
                    ["npx", "prettier", "--write", file_path],
                    check=True,
                    capture_output=True,
                )
            return True
        except subprocess.CalledProcessError as e:
            logger.warning(f"Linting warnings for {file_path}: {e.output.decode()}")
            return True  # Continue even with linting warnings
        except Exception as e:
            logger.error(f"Unexpected error during linting {file_path}: {str(e)}")
            return False

    @staticmethod
    def save_fixed_code(file_path: str, fixed_code: str) -> bool:
        """Save the fixed code back to the file."""
        try:
            with open(file_path, "w", encoding="utf-8") as file:
                file.write(fixed_code)
            logger.info(f"Successfully saved fixes to {file_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving fixes to {file_path}: {str(e)}")
            return False

    async def process_directory(self, directory: str) -> Dict[str, List[str]]:
        """Process all supported files in the directory recursively."""
        results = {
            "fixed": [],
            "failed": [],
            "skipped": [],
            "timeout": [],
            "in_progress": [],
        }

        # Priority paths for processing
        priority_paths = {
            "critical": [  # Most critical core functionality files
                "backend/core/middleware_integration.py",
                "backend/core/config_manager.py",
                "backend/middleware/request_handler.py",
                "backend/config/base_config.py",
                "server/index.ts",
                "server/routes.ts",
            ],
            "highest": [  # Core system files
                "backend/core/",
                "backend/middleware/",
                "backend/config/",
                "backend/routes/",
            ],
            "high": [  # Main application files
                "src/App.",
                "src/main.",
                "static/js/flashcard-system.js",
                "static/js/study-system.js",
            ],
            "medium": [  # Supporting functionality
                "backend/services/",
                "backend/utils/",
                "src/components/",
                "src/hooks/",
            ],
            "low": ["backend/", "server/", "src/", "static/js/"],  # Non-critical files
        }

        # Directories to exclude
        exclude_dirs = {
            ".git",
            ".pythonlibs",
            "node_modules",
            "venv",
            "__pycache__",
            "migrations",
            "dist",
            "build",
            "coverage",
            "tests",
            ".pytest_cache",
            "logs",
            "temp",
            "tmp",
            ".venv",
        }

        # Maximum file size to process (1MB)
        MAX_FILE_SIZE = 1024 * 1024

        # Files to exclude
        exclude_files = {
            # Configuration files
            "migrations.py",
            "alembic.ini",
            "setup.py",
            "conftest.py",
            "jest.config.ts",
            "babel.config.js",
            "tsconfig.json",
            "vite.config.ts",
            "postcss.config.js",
            "tailwind.config.ts",
            "package.json",
            "package-lock.json",
            # Empty or boilerplate files
            "__init__.py",
            "index.d.ts",
            # Test files
            "test_*.py",
            "*_test.py",
            "*.test.ts",
            "*.spec.ts",
            "*.test.tsx",
            "*.spec.tsx",
            # Generated files
            "*.min.js",
            "*.min.css",
            "*.map",
            # Temporary files
            "*.tmp",
            "*.temp",
            "*.bak",
            "*.swp",
        }

        # Collect all eligible files first
        files_to_process = []
        total_files = 0
        skipped_files = {"size": [], "excluded": [], "unsupported": []}

        for root, dirs, files in os.walk(directory):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]

            for file_name in files:
                total_files += 1
                file_path = os.path.join(root, file_name)

                # Check for excluded files
                if any(
                    file_name.endswith(exc) or file_name == exc for exc in exclude_files
                ):
                    skipped_files["excluded"].append(file_path)
                    continue

                # Skip files that are too large
                try:
                    if os.path.getsize(file_path) > MAX_FILE_SIZE:
                        logger.info(f"Skipping large file: {file_path}")
                        skipped_files["size"].append(file_path)
                        continue
                except OSError:
                    logger.warning(f"Could not check size of {file_path}")
                    continue

                language = self.detect_language(file_path)
                if language:
                    # Check priority level (0-4, where 0 is critical and 4 is lowest)
                    priority = 4  # Default lowest priority

                    # First check exact matches for critical files
                    if file_path in priority_paths["critical"]:
                        priority = 0
                    else:
                        # Then check patterns from highest to lowest
                        for p_level, (category, patterns) in enumerate(
                            [
                                ("highest", priority_paths["highest"]),
                                ("high", priority_paths["high"]),
                                ("medium", priority_paths["medium"]),
                                ("low", priority_paths["low"]),
                            ],
                            1,
                        ):  # Start from 1 since 0 is reserved for critical
                            if any(pattern in file_path for pattern in patterns):
                                priority = p_level
                                break

                    # Only append if priority is not lowest
                    if priority < 4:
                        files_to_process.append((file_path, language, priority))
                        logger.info(f"Queued {file_path} with priority {priority}")
                    else:
                        skipped_files["excluded"].append(file_path)
                        logger.debug(f"Skipped low priority file: {file_path}")
                else:
                    results["skipped"].append(file_path)

        # Sort files with priority paths first, keeping priority info
        files_to_process.sort(key=lambda x: (x[2], x[0]))

        # Process files one at a time with careful error handling
        total_files = len(files_to_process)
        async with self as review_system:
            for index, (file_path, language, priority) in enumerate(files_to_process):
                results["in_progress"].append(file_path)
                logger.info(
                    f"\nProcessing file {index + 1}/{total_files} ({(index + 1)/total_files*100:.1f}%)"
                )
                logger.info(f"Current file: {file_path} (Priority: {priority})")
                try:
                    # Add delay between API calls to avoid rate limits
                    await asyncio.sleep(1)

                    # Step 1: Fix code
                    fixed_code = await review_system.fix_code(file_path, language)
                    if not fixed_code:
                        results["failed"].append(file_path)
                        continue

                    # Step 2: Save fixes
                    if review_system.save_fixed_code(file_path, fixed_code):
                        # Step 3: Apply linters
                        if review_system.apply_linters(file_path, language):
                            results["fixed"].append(file_path)
                            logger.info(f"Successfully processed {file_path}")
                        else:
                            results["failed"].append(file_path)
                    else:
                        results["failed"].append(file_path)

                except Exception as e:
                    logger.error(f"Error processing {file_path}: {str(e)}")
                    results["failed"].append(file_path)

                try:
                    # Set timeout based on priority level
                    timeout = {
                        0: 20,  # Critical files get shortest timeout
                        1: 30,  # Highest priority
                        2: 45,  # High priority
                        3: 60,  # Medium priority
                    }.get(priority, 90)  # Default longer timeout for other files

                    # Use asyncio.wait_for for the entire file processing
                    try:
                        async with asyncio.timeout(timeout):
                            logger.info(
                                f"Starting review of {file_path} with {timeout}s timeout"
                            )
                            fixed_code = await review_system.fix_code(
                                file_path, language
                            )

                            if not fixed_code:
                                logger.warning(f"No fixes generated for {file_path}")
                                results["failed"].append(file_path)
                                continue

                            # Save and lint in smaller steps with individual error handling
                            save_success = review_system.save_fixed_code(
                                file_path, fixed_code
                            )
                            if not save_success:
                                logger.error(f"Failed to save fixes for {file_path}")
                                results["failed"].append(file_path)
                                continue

                            lint_success = review_system.apply_linters(
                                file_path, language
                            )
                            if not lint_success:
                                logger.warning(f"Linting failed for {file_path}")
                                # Still mark as fixed if only linting failed
                                results["fixed"].append(file_path)
                            else:
                                results["fixed"].append(file_path)
                                logger.info(f"Successfully processed {file_path}")

                    except asyncio.TimeoutError:
                        logger.error(f"Timeout ({timeout}s) exceeded for {file_path}")
                        results["timeout"].append(file_path)
                    except Exception as e:
                        logger.error(
                            f"Unexpected error processing {file_path}: {str(e)}"
                        )
                        results["failed"].append(file_path)

                    # Adaptive delay based on priority and file size
                    file_size = os.path.getsize(file_path)
                    base_delay = {
                        0: 1,  # Critical files
                        1: 2,  # Highest priority
                        2: 3,  # High priority
                        3: 4,  # Medium priority
                    }.get(priority, 5)  # Default longer delay for other files

                    size_factor = min(
                        file_size / (500 * 1024), 2
                    )  # Cap at 2x for files larger than 500KB
                    delay = base_delay * size_factor

                    await asyncio.sleep(delay)

                except Exception as e:
                    logger.error(f"Error processing {file_path}: {str(e)}")
                    results["failed"].append(file_path)
                    results["in_progress"].remove(file_path)
                    await asyncio.sleep(5)
                    continue

                results["in_progress"].remove(file_path)

                # Progress update after each file
                logger.info(f"\nProgress Update:")
                logger.info(f"Fixed: {len(results['fixed'])} files")
                logger.info(f"Failed: {len(results['failed'])} files")
                logger.info(f"Timeout: {len(results['timeout'])} files")
                logger.info(f"In Progress: {len(results['in_progress'])} files")
                logger.info(f"Remaining: {total_files - (index + 1)} files")

                # Add periodic progress update
                if (index + 1) % 5 == 0:  # Update every 5 files
                    await asyncio.sleep(3)
                    percent_complete = ((index + 1) / total_files) * 100
                    logger.info(
                        f"Progress: {percent_complete:.1f}% ({index + 1}/{total_files} files)"
                    )
                    logger.info(
                        f"Status: Fixed={len(results['fixed'])}, Failed={len(results['failed'])}, Timeout={len(results['timeout'])}"
                    )

        # Log comprehensive processing summary
        logger.info("\nCode Review Summary:")
        logger.info("=" * 50)
        logger.info("Processing Statistics:")
        logger.info(f"Total files scanned: {total_files}")
        logger.info(f"Successfully fixed: {len(results['fixed'])} files")
        logger.info(f"Failed to process: {len(results['failed'])} files")
        logger.info(f"Timed out: {len(results['timeout'])} files")

        logger.info("\nSkipped Files:")
        logger.info(f"Size limit exceeded: {len(skipped_files['size'])}")
        logger.info(f"Excluded patterns: {len(skipped_files['excluded'])}")
        logger.info(f"Unsupported types: {len(skipped_files['unsupported'])}")

        # Calculate success rate
        processed_files = (
            len(results["fixed"]) + len(results["failed"]) + len(results["timeout"])
        )
        if processed_files > 0:
            success_rate = (len(results["fixed"]) / processed_files) * 100
            logger.info(f"\nSuccess Rate: {success_rate:.1f}%")

        logger.info("=" * 50)

        if results["failed"]:
            logger.error("\nFailed files:")
            for file in results["failed"]:
                logger.error(f"- {file}")

        return results


async def main():
    """Main entry point for the code fixing system."""
    try:
        review_system = CodeReviewSystem()
        project_root = Path(__file__).parent.parent

        logger.info("Starting automated code review process...")
        results = await review_system.process_directory(str(project_root))

        logger.info("\nCode Review Summary:")
        logger.info(f"Fixed files: {len(results['fixed'])}")
        logger.info(f"Failed files: {len(results['failed'])}")
        logger.info(f"Skipped files: {len(results['skipped'])}")

        if results["failed"]:
            logger.error("\nFailed files:")
            for file in results["failed"]:
                logger.error(f"- {file}")

    except Exception as e:
        logger.error(f"Fatal error in code review process: {str(e)}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
