import os
from code_review_service import CodeReviewService
import json

def test_code_review():
    try:
        # Create an instance of the code review service
        service = CodeReviewService()
        
        # Test directory - using a small subset of files
        test_dir = "client/src/components"
        
        print(f"Testing code review for directory: {test_dir}")
        
        # Run the review
        results = service.review_directory(test_dir)
        
        # Print results in a readable format
        print("\nCode Review Results:")
        print(json.dumps(results, indent=2))
        
        return True
    except Exception as e:
        print(f"Error during test: {str(e)}")
        return False

if __name__ == "__main__":
    test_code_review()
