import unittest
import asyncio
from backend.services.analytics_service import AnalyticsService


class TestAnalytics(unittest.TestCase):
    def setUp(self):
        self.service = AnalyticsService()
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    def test_dashboard_data(self):
        async def run_test():
            result = await self.service.get_dashboard_data("test_user", "week")
            self.assertIsNotNone(result)
            self.assertIn("performance_data", result)
            self.assertIn("topic_mastery", result)
            self.assertIn("learning_patterns", result)

        self.loop.run_until_complete(run_test())
