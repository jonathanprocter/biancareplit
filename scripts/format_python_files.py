#!/usr/bin/env python3
import logging
import os
import subprocess

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROJECT_DIRS = [
    "backend",
    "services",
    "tests",
    "scripts",
]


def format_python_files():
    """Format Python files in specified project directories using Black and Flake8."""
    try:
        # Format with Black
        logger.info("Running Black formatter...")
        for directory in PROJECT_DIRS:
            if os.path.exists(directory):
                logger.info(f"Formatting directory: {directory}")
                try:
                    subprocess.run(["black", directory], check=True)
                except subprocess.CalledProcessError as e:
                    logger.error(f"Error formatting {directory}: {str(e)}")
                    continue

        # Run Flake8
        logger.info("Running Flake8 linter...")
        try:
            subprocess.run(["flake8"], check=False)
        except subprocess.CalledProcessError:
            logger.warning("Flake8 found style issues, but continuing...")

        # Run isort
        logger.info("Running isort...")
        for directory in PROJECT_DIRS:
            if os.path.exists(directory):
                try:
                    subprocess.run(["isort", directory], check=True)
                except subprocess.CalledProcessError as e:
                    logger.error(f"Error sorting imports in {directory}: {str(e)}")
                    continue

        logger.info("Code formatting completed!")
        return True
    except Exception as e:
        logger.error(f"Unexpected error during formatting: {str(e)}")
        return False


if __name__ == "__main__":
    success = format_python_files()
    exit(0 if success else 1)
