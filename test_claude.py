
from services.claude_service import ClaudeService

def main():
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
    
    try:
        print("\nRequesting code review from Claude...\n")
        review_result = claude.review_and_fix_code(test_code)
        print("Code Review Results:")
        print("-" * 50)
        print(review_result)
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()
