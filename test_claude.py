
from services.claude_service import ClaudeService

def main():
    try:
        claude = ClaudeService()
        
        # Test code sample with multiple aspects to review
        test_code = """
def process_data(data: list) -> list:
    result = []
    for i in range(len(data)):
        if data[i] > 0:
            result.append(data[i] * 2)
    return result

def calculate_average(numbers: list) -> float:
    return sum(numbers) / len(numbers)
        """
        
        print("\nInitializing Claude service...")
        print("API URL:", claude.api_url)
        print("\nRequesting code review from Claude...\n")
        
        review_result = claude.review_and_fix_code(test_code)
        
        print("Code Review Results:")
        print("-" * 50)
        print(review_result)
        
    except ValueError as ve:
        print(f"Configuration Error: {str(ve)}")
    except requests.exceptions.RequestException as re:
        print(f"API Request Error: {str(re)}")
        print(f"Response status code: {re.response.status_code if hasattr(re, 'response') else 'N/A'}")
        print(f"Response body: {re.response.text if hasattr(re, 'response') else 'N/A'}")
    except Exception as e:
        print(f"Unexpected Error: {type(e).__name__}: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    main()
