"""Code review and automated fixing system for the codebase."""

import os
import subprocess
import requests
import logging
from pathlib import Path
from typing import Dict, Optional, List
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

class CodeReviewSystem:
    """Manages code review and automated fixing."""

    def __init__(self):
        """Initialize the code review system."""
        self.openai_api_key = OPENAI_API_KEY
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")

        self.headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json"
        }

    def detect_language(self, file_path: str) -> Optional[str]:
        """Detect the programming language based on file extension."""
        _, ext = os.path.splitext(file_path)
        return SUPPORTED_LANGUAGES.get(ext)

    async def fix_code(self, file_path: str, language: str) -> Optional[str]:
        """Review and fix code using OpenAI API."""
        try:
            with open(file_path, "r", encoding="utf-8") as file:
                code_content = file.read()

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

            payload = {
                "model": "gpt-4",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3
            }

            response = requests.post(API_URL, headers=self.headers, json=payload)
            if response.status_code == 200:
                fixed_code = response.json()["choices"][0]["message"]["content"]
                logger.info(f"Successfully fixed {file_path}")
                return fixed_code
            else:
                logger.error(f"API error: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error fixing {file_path}: {str(e)}")
            return None

    def apply_linters(self, file_path: str, language: str) -> bool:
        """Apply language-specific linters and formatters."""
        try:
            if language == "Python":
                subprocess.run(["black", file_path], check=True, capture_output=True)
                subprocess.run(["flake8", file_path], check=True, capture_output=True)
            elif language in ["JavaScript", "TypeScript"]:
                subprocess.run(["npx", "eslint", "--fix", file_path], check=True, capture_output=True)
                subprocess.run(["npx", "prettier", "--write", file_path], check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            logger.warning(f"Linting warnings for {file_path}: {e.output.decode()}")
            return True  # Continue even with linting warnings
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

    async def process_directory(self, directory: str, batch_size: int = 2) -> Dict[str, List[str]]:
        """Process all supported files in the directory recursively."""
        results = {
            "fixed": [],
            "failed": [],
            "skipped": []
        }

        # Priority paths to process first - critical application files
        priority_paths = {
            'highest': [
                'backend/core/',
                'backend/middleware/',
                'backend/config/',
                'backend/routes/',
                'server/index.ts',
            ],
            'high': [
                'src/App.',
                'src/main.',
                'server/routes.ts',
                'static/js/flashcard-system.js',
            ],
            'medium': [
                'backend/',
                'server/',
                'src/',
                'static/js/'
            ]
        }
        
        # Directories to exclude
        exclude_dirs = {
            '.git',
            '.pythonlibs',
            'node_modules',
            'venv',
            '__pycache__',
            'migrations',
            'dist',
            'build',
            'coverage',
            'tests',
            '.pytest_cache',
            'logs',
            'temp',
            'tmp',
            '.venv'
        }

        # Maximum file size to process (1MB)
        MAX_FILE_SIZE = 1024 * 1024
        
        # Files to exclude
        exclude_files = {
            'migrations.py',
            'alembic.ini',
            'setup.py',
            'conftest.py',
            '__init__.py',
            'test_*.py',
            '*_test.py',
            '*.test.ts',
            '*.spec.ts'
        }

        # Collect all eligible files first
        files_to_process = []
        total_files = 0
        skipped_files = {'size': [], 'excluded': [], 'unsupported': []}
        
        for root, dirs, files in os.walk(directory):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file_name in files:
                total_files += 1
                file_path = os.path.join(root, file_name)
                
                # Check for excluded files
                if any(file_name.endswith(exc) or file_name == exc for exc in exclude_files):
                    skipped_files['excluded'].append(file_path)
                    continue
                
                # Skip files that are too large
                try:
                    if os.path.getsize(file_path) > MAX_FILE_SIZE:
                        logger.info(f"Skipping large file: {file_path}")
                        skipped_files['size'].append(file_path)
                        continue
                except OSError:
                    logger.warning(f"Could not check size of {file_path}")
                    continue

                language = self.detect_language(file_path)
                if language:
                    # Check priority level (0 highest, 3 lowest)
                    priority = 3  # Default lowest priority
                    
                    # Check priority patterns from highest to lowest
                    for p_level, patterns in [
                        (0, priority_paths['highest']), 
                        (1, priority_paths['high']),
                        (2, priority_paths['medium'])
                    ]:
                        if any(pattern in file_path for pattern in patterns):
                            priority = p_level
                            break
                            
                    # Only append if priority is not lowest
                    if priority < 3:
                        files_to_process.append((file_path, language, priority))
                    else:
                        skipped_files['excluded'].append(file_path)
                else:
                    results["skipped"].append(file_path)
        
        # Sort files with priority paths first
        files_to_process.sort(key=lambda x: (not x[2], x[0]))
        files_to_process = [(path, lang) for path, lang, _ in files_to_process]

        # Process files in batches with rate limiting
        for i in range(0, len(files_to_process), batch_size):
            batch = files_to_process[i:i + batch_size]
            
            for file_path, language in batch:
                logger.info(f"Processing {file_path} ({language})")
                try:
                    # Add delay between API calls to avoid rate limits
                    await asyncio.sleep(1)
                    
                    # Step 1: Fix code
                    fixed_code = await self.fix_code(file_path, language)
                    if not fixed_code:
                        results["failed"].append(file_path)
                        continue

                    # Step 2: Save fixes
                    if self.save_fixed_code(file_path, fixed_code):
                        # Step 3: Apply linters
                        if self.apply_linters(file_path, language):
                            results["fixed"].append(file_path)
                            logger.info(f"Successfully processed {file_path}")
                        else:
                            results["failed"].append(file_path)
                    else:
                        results["failed"].append(file_path)

                except Exception as e:
                    logger.error(f"Error processing {file_path}: {str(e)}")
                    results["failed"].append(file_path)
                    
                # Adjust delay based on priority
                priority = 3 # Default lowest priority
                for p_level, patterns in [(0, priority_paths['highest']), (1, priority_paths['high']), (2, priority_paths['medium'])]:
                    if any(pattern in file_path for pattern in patterns):
                        priority = p_level
                        break
                delay = 1 if priority == 0 else (2 if priority == 1 else 3)
                await asyncio.sleep(delay)
            
            # Add longer delay between batches
            await asyncio.sleep(5)
            total_processed = i + len(batch)
            percent_complete = (total_processed / len(files_to_process)) * 100
            logger.info(f"Progress: {percent_complete:.1f}% ({total_processed}/{len(files_to_process)} files)")
            

        # Log processing summary
        logger.info("\nCode Review Summary:")
        logger.info(f"Total files found: {total_files}")
        logger.info(f"Files processed: {len(results['fixed'])}")
        logger.info(f"Failed files: {len(results['failed'])}")
        logger.info(f"Skipped files:")
        logger.info(f"  - Size limit exceeded: {len(skipped_files['size'])}")
        logger.info(f"  - Excluded patterns: {len(skipped_files['excluded'])}")
        logger.info(f"  - Unsupported types: {len(skipped_files['unsupported'])}")
        
        if results['failed']:
            logger.error("\nFailed files:")
            for file in results['failed']:
                logger.error(f"- {file}")
        
        return results

async def main():
    """Main entry point for the code fixing system."""
    try:
        review_system = CodeReviewSystem()
        project_root = Path(__file__).parent.parent

        logger.info("Starting code review and fixing process...")
        results = await review_system.process_directory(str(project_root))

        logger.info("\nCode Review Summary:")
        logger.info(f"Fixed files: {len(results['fixed'])}")
        logger.info(f"Failed files: {len(results['failed'])}")
        logger.info(f"Skipped files: {len(results['skipped'])}")

        if results['failed']:
            logger.error("\nFailed files:")
            for file in results['failed']:
                logger.error(f"- {file}")

    except Exception as e:
        logger.error(f"Fatal error in code review process: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())