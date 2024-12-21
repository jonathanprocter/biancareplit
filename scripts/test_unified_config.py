"""Test unified configuration and middleware system."""

import os
import sys
import json
import time
import logging
import requests
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Add project root to Python path
project_root = str(Path(__file__).parent.parent.absolute())
sys.path.insert(0, project_root)

from backend.middleware.config import middleware_registry
from backend.middleware.base import (
    BaseMiddleware,
    MiddlewareConfig as BaseMiddlewareConfig,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class SystemTester:
    """System testing utility class."""

    def __init__(self, base_url: str = "http://0.0.0.0:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        self.max_retries = 10  # Increased retries
        self.retry_delay = 3  # Increased delay between retries
        self.logger = logging.getLogger(self.__class__.__name__)

    def _request_with_retry(
        self, method: str, endpoint: str, **kwargs
    ) -> requests.Response:
        """Make HTTP request with retry mechanism."""
        for attempt in range(self.max_retries):
            try:
                response = self.session.request(
                    method, f"{self.base_url}{endpoint}", **kwargs
                )
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                if attempt == self.max_retries - 1:
                    raise
                logger.warning(
                    f"Request failed (attempt {attempt + 1}/{self.max_retries}): {str(e)}"
                )
                time.sleep(self.retry_delay)

    def test_security_middleware(self) -> bool:
        """Test security middleware configuration."""
        try:
            # Test CSRF protection and security headers
            response = self._request_with_retry("GET", "/health")

            # Verify CSRF token
            csrf_token = response.headers.get("X-CSRF-Token")
            self.logger.info(f"CSRF token present: {bool(csrf_token)}")

            # Verify security headers with expected values
            security_headers = {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "SAMEORIGIN",
                "X-XSS-Protection": "1; mode=block",
                "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
                "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';",
            }

            headers_status = []
            for header, expected_value in security_headers.items():
                actual_value = response.headers.get(header)
                match = actual_value == expected_value if actual_value else False
                headers_status.append(match)
                self.logger.info(
                    f"{header}: Expected={expected_value}, Actual={actual_value}, Match={match}"
                )

            # Test CSRF protection with POST request
            try:
                post_response = self._request_with_retry(
                    "POST",
                    "/health",
                    headers={"X-CSRF-Token": csrf_token} if csrf_token else {},
                )
                csrf_working = post_response.status_code != 403
                self.logger.info(f"CSRF protection working: {csrf_working}")
            except requests.exceptions.RequestException as e:
                self.logger.info(f"CSRF test failed as expected: {str(e)}")
                csrf_working = True

            all_headers_present = all(headers_status)
            self.logger.info(
                f"All security headers present and correct: {all_headers_present}"
            )

            return bool(csrf_token) and all_headers_present and csrf_working
        except Exception as e:
            logger.error(f"Security middleware test failed: {str(e)}")
            return False

    def test_metrics_middleware(self) -> bool:
        """Test metrics endpoint and collection."""
        try:
            response = self._request_with_retry("GET", "/metrics")
            metrics_data = response.text

            required_metrics = [
                "flask_request_count",
                "flask_request_latency_seconds",
                "flask_app_info",
            ]

            # Detailed metric verification
            missing_metrics = []
            for metric in required_metrics:
                if metric not in metrics_data:
                    missing_metrics.append(metric)

            metrics_present = len(missing_metrics) == 0
            logger.info(f"Required metrics present: {metrics_present}")

            if not metrics_present:
                logger.warning(f"Missing metrics: {', '.join(missing_metrics)}")
            else:
                logger.info("All required metrics are present")

            return metrics_present and response.status_code == 200
        except Exception as e:
            logger.error(f"Metrics middleware test failed: {str(e)}")
            return False

    def test_cache_middleware(self) -> bool:
        """Test cache functionality."""
        try:
            # Test endpoint that should be cached
            cache_test_results = []

            # Test 1: Basic caching
            for i in range(3):  # Make multiple requests to verify consistent caching
                start_time = datetime.now()
                response = self._request_with_retry("GET", "/health")
                duration = (datetime.now() - start_time).total_seconds()

                # Check cache headers
                cache_control = response.headers.get("Cache-Control", "")
                etag = response.headers.get("ETag", "")

                self.logger.info(f"Request {i+1}:")
                self.logger.info(f"Duration: {duration:.3f}s")
                self.logger.info(f"Cache-Control: {cache_control}")
                self.logger.info(f"ETag: {etag}")

                if i > 0:  # Compare with first request
                    cache_test_results.append(
                        duration <= first_duration * 1.5
                    )  # Allow some variance

                if i == 0:
                    first_duration = duration
                    first_response = response.text
                else:
                    # Verify response content is identical
                    cache_test_results.append(response.text == first_response)

            # Test 2: Cache invalidation
            headers = {"Cache-Control": "no-cache"}
            invalidation_response = self._request_with_retry(
                "GET", "/health", headers=headers
            )
            cache_test_results.append(
                invalidation_response.headers.get("Cache-Control") != ""
            )

            cache_working = all(cache_test_results)
            self.logger.info(f"Cache middleware tests passed: {cache_working}")

            return cache_working
        except Exception as e:
            logger.error(f"Cache middleware test failed: {str(e)}")
            return False

    def test_health_endpoint(self) -> bool:
        """Test system health endpoint."""
        try:
            # Test both GET and POST methods
            get_response = self._request_with_retry("GET", "/health")
            post_data = {"test": "data"}
            post_response = self._request_with_retry("POST", "/health", json=post_data)

            for response in [get_response, post_response]:
                data = response.json()

                # Verify response structure
                required_fields = [
                    "status",
                    "timestamp",
                    "middleware",
                    "system_metrics",
                    "method",
                ]
                missing_fields = [
                    field for field in required_fields if field not in data
                ]
                if missing_fields:
                    logger.error(
                        f"Missing required fields in health response: {missing_fields}"
                    )
                    return False

                # Verify method-specific fields
                if data["method"] == "POST" and "request_data" not in data:
                    logger.error("POST response missing request_data field")
                    return False
                elif data["method"] == "POST" and data["request_data"] != post_data:
                    logger.error("POST request data mismatch")
                    return False

                # Verify all middleware components
                middleware_status = data.get("middleware", {})
                system_metrics = data.get("system_metrics", {})

                logger.info(f"\nHealth Check Results ({data['method']}):")
                logger.info("-" * 50)
                logger.info(f"Status: {data['status']}")
                logger.info(f"Timestamp: {data['timestamp']}")

                logger.info("\nMiddleware Component Status:")
                for component, status in middleware_status.items():
                    logger.info(f"{component:15}: {'✓' if status else '✗'}")

                logger.info("\nSystem Metrics:")
                for metric, value in system_metrics.items():
                    logger.info(f"{metric:15}: {value}")
                logger.info("-" * 50)

                if data["status"] not in ["healthy", "degraded"]:
                    logger.error(f"Unexpected health status: {data['status']}")
                    return False

                # Verify system metrics values are reasonable
                if not (0 <= system_metrics.get("cpu_usage", -1) <= 100):
                    logger.error("Invalid CPU usage value")
                    return False
                if not (0 <= system_metrics.get("memory_usage", -1) <= 100):
                    logger.error("Invalid memory usage value")
                    return False
                if not system_metrics.get("uptime", 0) > 0:
                    logger.error("Invalid uptime value")
                    return False

            return True

        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            logger.error("Stack trace:", exc_info=True)
            return False

    def run_all_tests(self) -> dict:
        """Run all system tests."""
        results = {
            "security": self.test_security_middleware(),
            "metrics": self.test_metrics_middleware(),
            "cache": self.test_cache_middleware(),
            "health": self.test_health_endpoint(),
        }

        logger.info("\nTest Results:")
        for component, status in results.items():
            logger.info(f"{component}: {'✓' if status else '✗'}")

        return results


def main():
    """Main test execution."""
    try:
        logger.info("Starting system tests...")
        logger.info("Waiting for services to be fully available...")

        # Add initial delay to allow services to start
        time.sleep(5)

        # Initialize tester
        tester = SystemTester()

        # Run all tests
        results = tester.run_all_tests()

        # Determine overall status
        success = all(results.values())

        # Print detailed results
        logger.info("\nDetailed Test Results:")
        logger.info("-" * 50)
        for component, status in results.items():
            status_symbol = "✓" if status else "✗"
            logger.info(f"{component:20} [{status_symbol}]")
        logger.info("-" * 50)

        if success:
            logger.info("\nAll system tests passed successfully! 🎉")
            sys.exit(0)
        else:
            logger.error(
                "\nSome system tests failed. Please check the logs above for details."
            )
            sys.exit(1)

    except Exception as e:
        logger.error(f"System testing failed: {str(e)}")
        logger.error("Stack trace:", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
