import time
from functools import wraps
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def timing_decorator(f):
    """Measure execution time of functions"""

    @wraps(f)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = f(*args, **kwargs)
        end = time.time()
        logger.info(f"{f.__name__} took {end - start:.2f} seconds to execute")
        return result

    return wrapper


def validate_request_data(data, required_fields):
    """Validate incoming request data"""
    if not data:
        return False, "No data provided"

    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"

    return True, None
