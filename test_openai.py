import asyncio
import logging
import os
import sys

from openai import AsyncOpenAI

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def test_openai():
    """Test OpenAI API connection with detailed logging"""
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.error("OpenAI API key not found in environment variables")
            return False

        logger.info("Initializing OpenAI client...")
        client = AsyncOpenAI(api_key=api_key)

        logger.info("Testing API connection...")
        response = await client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a medical content analyzer."},
                {"role": "user", "content": "Say hello"},
            ],
            max_tokens=10,
        )

        logger.info("OpenAI test successful")
        logger.info(f"Response: {response.choices[0].message.content}")
        return True

    except Exception as e:
        logger.error(f"OpenAI test failed with error: {str(e)}")
        return False


if __name__ == "__main__":
    try:
        logger.info("Starting OpenAI connection test...")
        result = asyncio.run(test_openai())
        if not result:
            logger.error("Test failed - check the logs above for details")
            sys.exit(1)
        logger.info("Test completed successfully")
    except Exception as e:
        logger.error(f"Test execution failed: {str(e)}")
        sys.exit(1)
