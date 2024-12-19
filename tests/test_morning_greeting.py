
import unittest
import asyncio
from datetime import datetime
from backend.services.morning_greeting_service import MorningGreetingService

class TestMorningGreeting(unittest.TestCase):
    def setUp(self):
        self.service = MorningGreetingService()
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        
    def tearDown(self):
        self.loop.close()
        
    def test_generate_greeting(self):
        async def run_test():
            result = await self.service.generate_morning_greeting("test_user")
            self.assertIsNotNone(result)
            self.assertIn('date', result)
            self.assertIn('performance', result)
            self.assertIn('ai_coach_interactions', result)
            self.assertIn('nclex_predictions', result)
            
        self.loop.run_until_complete(run_test())
