#!/usr/bin/env python3
"""Test unified configuration and middleware system."""

import logging
import sys
import time
import requests
from backend.middleware.validation import MiddlewareValidator

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class SystemTester:
    """Test system configuration and middleware."""

    def __init__(self):
        self.logger = logger
        self.base_url = "http://localhost:5000"
        self.validator = MiddlewareValidator()

    def _request_with_retry(
        self, method: str, endpoint: str, retries: int = 3, **kwargs
    ) -> requests.Response:
        """Make HTTP request with retries."""
        last_error = None

        for attempt in range(retries):
            try:
                response = requests.request(
                    method, f"{self.base_url}{endpoint}", **kwargs
                )
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                last_error = e
                self.logger.warning(
                    "Request attempt %d failed: %s", attempt + 1, str(e)
                )
                if attempt < retries - 1:
                    time.sleep(2**attempt)  # Exponential backoff
                continue

        if last_error:
            raise last_error

    def test_security_middleware(self) -> bool:
        """Test security middleware functionality."""
        try:
            # Test CORS configuration
            response = self._request_with_retry(
                "OPTIONS", "/api/test", headers={"Origin": "http://localhost:3000"}
            )

            # Verify CORS headers
            headers = response.headers
            required_headers = [
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Methods",
                "Access-Control-Allow-Headers",
            ]

            for header in required_headers:
                if header not in headers:
                    self.logger.error("Missing CORS header: %s", header)
                    return False

            # Test security headers
            security_headers = [
                "X-Content-Type-Options",
                "X-Frame-Options",
                "X-XSS-Protection",
            ]

            response = self._request_with_retry("GET", "/")
            for header in security_headers:
                if header not in response.headers:
                    self.logger.error("Missing security header: %s", header)
                    return False

            return True

        except Exception as e:
            self.logger.error("Security middleware test failed: %s", str(e))
            return False

    def test_metrics_middleware(self) -> bool:
        """Test metrics collection middleware."""
        try:
            # Make several requests to generate metrics
            endpoints = ["/", "/api/test", "/health"]
            for endpoint in endpoints:
                self._request_with_retry("GET", endpoint)

            # Verify metrics endpoint
            response = self._request_with_retry("GET", "/metrics")
            metrics_data = response.text

            # Check for expected metric types
            required_metrics = [
                "http_requests_total",
                "http_request_duration_seconds",
                "http_request_size_bytes",
            ]

            metrics_present = all(metric in metrics_data for metric in required_metrics)

            if not metrics_present:
                self.logger.error("Missing required metrics")
                return False

            return True

        except Exception as e:
            self.logger.error("Metrics middleware test failed: %s", str(e))
            return False

    def test_cache_middleware(self) -> bool:
        """Test caching middleware functionality."""
        try:
            # Test endpoints that should be cached
            cache_test_results = []
            test_endpoints = ["/api/cached-data", "/api/static-content"]

            for endpoint in test_endpoints:
                # First request
                response1 = self._request_with_retry("GET", endpoint)
                time1 = response1.headers.get("X-Response-Time")

                # Second request (should be cached)
                response2 = self._request_with_retry("GET", endpoint)
                time2 = response2.headers.get("X-Response-Time")

                # Verify cache headers
                cache_status = response2.headers.get("X-Cache-Status")
                if time1 is not None and time2 is not None:
                    cache_test_results.append(
                        cache_status == "HIT" and float(time2) <= float(time1)
                    )

            cache_working = all(cache_test_results)
            self.logger.info("Cache middleware tests passed: %s", cache_working)

            return cache_working
        except Exception as e:
            self.logger.error("Cache middleware test failed: %s", str(e))
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
                    self.logger.error(
                        "Missing required fields in response: %s", missing_fields
                    )
                    return False

                # Verify method-specific fields
                if data["method"] == "POST" and "request_data" not in data:
                    self.logger.error("POST response missing request_data field")
                    return False
                if data["method"] == "POST" and data["request_data"] != post_data:
                    self.logger.error("POST request data mismatch")
                    return False

            return True

        except Exception as e:
            self.logger.error("Health check failed: %s", str(e))
            return False

    def run_all_tests(self) -> bool:
        """Run all system tests."""
        test_results = {
            "security": self.test_security_middleware(),
            "metrics": self.test_metrics_middleware(),
            "cache": self.test_cache_middleware(),
            "health": self.test_health_endpoint(),
        }

        self.logger.info("\nTest Results:")
        for component, status in test_results.items():
            self.logger.info("%s: %s", component, "✓" if status else "✗")

        return all(test_results.values())


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
        success = tester.run_all_tests()

        # Print detailed results
        logger.info("\nDetailed Test Results:")
        logger.info("-" * 50)
        test_results = {
            "security": tester.test_security_middleware(),
            "metrics": tester.test_metrics_middleware(),
            "cache": tester.test_cache_middleware(),
            "health": tester.test_health_endpoint(),
        }
        for component, status in test_results.items():
            status_symbol = "✓" if status else "✗"
            logger.info("%20s [%s]", component, status_symbol)
        logger.info("-" * 50)

        if success:
            logger.info("\nAll system tests passed successfully! 🎉")
            sys.exit(0)
        else:
            logger.error(
                "\nSome system tests failed. "
                "Please check the logs above for details."
            )
            sys.exit(1)

    except Exception as e:
        logger.error("System testing failed: %s", str(e))
        logger.error("Stack trace:", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
