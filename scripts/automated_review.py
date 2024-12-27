#!/usr/bin/env python3
import asyncio
import logging
import sys
from pathlib import Path

from services.code_review_service import CodeReviewService

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def main():
    try:
        logger.info("Starting automated code review process...")
        review_service = CodeReviewService()
        project_root = Path(__file__).parent.parent

        logger.info("Beginning code review and automated fixes...")
        results = await review_service.process_directory(str(project_root))

        logger.info("\nCode Review Summary:")
        logger.info("=" * 50)
        logger.info(f"Processed files: {results['stats']['processed']}")
        logger.info(f"Fixes applied: {results['stats']['fixes_applied']}")
        logger.info(f"Failed files: {results['stats']['errors']}")

        if results["failed"]:
            logger.error("\nFailed files:")
            for file in results["failed"]:
                logger.error(f"- {file}")

        return results["status"] == "completed"

    except Exception as e:
        logger.error(f"Fatal error in code review process: {str(e)}")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
