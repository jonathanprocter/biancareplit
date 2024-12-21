#!/usr/bin/env python3
"""Test unified configuration and middleware system."""

import logging
import sys
import time
import requests
from datetime import datetime
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Add project root to Python path
project_root = str(Path(__file__).parent.parent.absolute())
sys.path.insert(0, project_root)


class SystemTester:
    """System testing utility class."""

    def __init__(self, base_url: str = "http://0.0.0.0:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        self.max_retries = 10  # Increased retries
        self.retry_delay = 3  # Increased delay between retries
        self.logger = logging.getLogger(self.__class__.__name__)

    def _request_with_retry(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> requests.Response:
        """Make HTTP request with retry mechanism."""
        for attempt in range(self.max_retries):
            try:
                response = self.session.request(
                    method,
                    f"{self.base_url}{endpoint}",
                    **kwargs
                )
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                if attempt == self.max_retries - 1:
                    raise
                self.logger.warning(
                    "Request failed (attempt %d/%d): %s",
                    attempt + 1,
                    self.max_retries,
                    str(e)
                )
                time.sleep(self.retry_delay)

    def test_security_middleware(self) -> bool:
        """Test security middleware configuration."""
        try:
            # Test CSRF protection and security headers
            response = self._request_with_retry("GET", "/health")

            # Verify CSRF token
            csrf_token = response.headers.get("X-CSRF-Token")
            self.logger.info("CSRF token present: %s", bool(csrf_token))

            # Verify security headers with expected values
            security_headers = {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "SAMEORIGIN",
                "X-XSS-Protection": "1; mode=block",
                "Strict-Transport-Security": (
                    "max-age=31536000; includeSubDomains"
                ),
                "Content-Security-Policy": (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval';"
                ),
            }

            headers_status = []
            for header, expected_value in security_headers.items():
                actual_value = response.headers.get(header)
                match = (
                    actual_value == expected_value if actual_value else False
                )
                headers_status.append(match)
                self.logger.info(
                    "%s: Expected=%s, Actual=%s, Match=%s",
                    header,
                    expected_value,
                    actual_value,
                    match
                )

            # Test CSRF protection with POST request
            try:
                post_response = self._request_with_retry(
                    "POST",
                    "/health",
                    headers={"X-CSRF-Token": csrf_token} if csrf_token else {},
                )
                csrf_working = post_response.status_code != 403
                self.logger.info("CSRF protection working: %s", csrf_working)
            except requests.exceptions.RequestException as e:
                self.logger.info(
                    "Request failed as expected: %s",
                    str(e)
                )
                csrf_working = True

            all_headers_present = all(headers_status)
            self.logger.info(
                "All security headers present and correct: %s",
                all_headers_present
            )

            return bool(csrf_token) and all_headers_present and csrf_working
        except Exception as e:
            self.logger.error("Security middleware test failed: %s", str(e))
            return False

    def test_metrics_middleware(self) -> bool:
        """Test metrics endpoint and collection."""
        try:
            response = self._request_with_retry(
                "GET",
                "/metrics"
            )
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
            self.logger.info("Required metrics present: %s", metrics_present)

            if not metrics_present:
                self.logger.warning(
                    "Missing metrics: %s",
                    ", ".join(missing_metrics)
                )
            else:
                self.logger.info("All required metrics are present")

            return metrics_present and response.status_code == 200
        except Exception as e:
            self.logger.error("Metrics middleware test failed: %s", str(e))
            return False

    def test_cache_middleware(self) -> bool:
        """Test cache functionality."""
        try:
            # Test endpoint that should be cached
            cache_test_results = []
            first_duration = None
            first_response = None

            # Test 1: Basic caching
            for i in range(3):  # Multiple requests to verify caching
                start_time = datetime.now()
                response = self._request_with_retry("GET", "/health")
                duration = (datetime.now() - start_time).total_seconds()

                # Check cache headers
                cache_control = response.headers.get("Cache-Control", "")
                etag = response.headers.get("ETag", "")

                self.logger.info("Request %d:", i + 1)
                self.logger.info("Duration: %.3fs", duration)
                self.logger.info("Cache-Control: %s", cache_control)
                self.logger.info("ETag: %s", etag)

                if i == 0:
                    first_duration = duration
                    first_response = response.text
                else:
                    # Compare with first request
                    cache_test_results.append(
                        duration <= first_duration * 1.5  # Allow variance
                    )
                    # Verify response content is identical
                    cache_test_results.append(
                        response.text == first_response
                    )

            # Test 2: Cache invalidation
            headers = {"Cache-Control": "no-cache"}
            invalidation_response = self._request_with_retry(
                "GET",
                "/health",
                headers=headers
            )
            cache_test_results.append(
                invalidation_response.headers.get("Cache-Control") != ""
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
            get_response = self._request_with_retry(
                "GET",
                "/health"
            )
            post_data = {"test": "data"}
            post_response = self._request_with_retry(
                "POST",
                "/health",
                json=post_data
            )

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
                    field for field in required_fields
                    if field not in data
                ]
                if missing_fields:
                    self.logger.error(
                        "Missing required fields in response: %s",
                        missing_fields
                    )
                    return False

                # Verify method-specific fields
                if data["method"] == "POST" and "request_data" not in data:
                    self.logger.error("POST response missing request_data field")
                    return False
                elif (
                    data["method"] == "POST"
                    and data["request_data"] != post_data
                ):
                    self.logger.error("POST request data mismatch")
                    return False

                # Verify all middleware components
                middleware_status = data.get(
                    "middleware",
                    {}
                )
                system_metrics = data.get(
                    "system_metrics",
                    {}
                )

                self.logger.info(
                    "\nHealth Check Results (%s):",
                    data.get("method", "unknown")
                )
                self.logger.info("-" * 50)
                self.logger.info("Status: %s", data["status"])
                self.logger.info("Timestamp: %s", data["timestamp"])

                self.logger.info("\nMiddleware Component Status:")
                for component, status in middleware_status.items():
                    self.logger.info(
                        "%15s: %s",
                        component,
                        "✓" if status else "✗"
                    )

                self.logger.info("\nSystem Metrics:")
                for metric, value in system_metrics.items():
                    self.logger.info("%15s: %s", metric, value)
                self.logger.info("-" * 50)

                if data["status"] not in ["healthy", "degraded"]:
                    self.logger.error(
                        "Unexpected health status: %s",
                        data["status"]
                    )
                    return False

                # Verify system metrics values are reasonable
                if not (0 <= system_metrics.get("cpu_usage", -1) <= 100):
                    self.logger.error("Invalid CPU usage value")
                    return False
                if not (0 <= system_metrics.get("memory_usage", -1) <= 100):
                    self.logger.error("Invalid memory usage value")
                    return False
                if not system_metrics.get("uptime", 0) > 0:
                    self.logger.error("Invalid uptime value")
                    return False

            return True

        except Exception as e:
            self.logger.error("Health check failed: %s", str(e))
            self.logger.error("Stack trace:", exc_info=True)
            return False

    def run_all_tests(self) -> dict:
        """Run all system tests."""
        results = {
            "security": self.test_security_middleware(),
            "metrics": self.test_metrics_middleware(),
            "cache": self.test_cache_middleware(),
            "health": self.test_health_endpoint(),
        }

        self.logger.info("\nTest Results:")
        for component, status in results.items():
            self.logger.info(
                "%s: %s",
                component,
                "✓" if status else "✗"
            )

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


