
import unittest
import asyncio
from tests.test_morning_greeting import TestMorningGreeting
from tests.test_analytics import TestAnalytics

def run_tests():
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test cases
    suite.addTests(loader.loadTestsFromTestCase(TestMorningGreeting))
    suite.addTests(loader.loadTestsFromTestCase(TestAnalytics))
    
    # Run tests with async support
    runner = unittest.TextTestRunner(verbosity=2)
    
    # Create event loop for async tests
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        result = runner.run(suite)
        return result.wasSuccessful()
    finally:
        loop.close()

if __name__ == '__main__':
    success = run_tests()
    exit(0 if success else 1)
