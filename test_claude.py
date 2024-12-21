
from services.claude_service import ClaudeService

def main():
    claude = ClaudeService()
    
    # Example code to review
    code = """def faulty_function(x):
        if x = 10  # Syntax error
            print("x is ten")
    """
    
    try:
        response = claude.review_code(code)

    # Test code review functionality
    code_with_issues = """
def calculate_sum(numbers):
    total = 0
    for i in range(len(numbers)):
        total = total + numbers[i]
    return total"""
    
    try:
        review_result = claude.review_and_fix_code(code_with_issues)
        print("\nCode Review Results:\n")
        print(review_result)
    except Exception as e:
        print(f"Error during code review: {str(e)}")



    # Example code review
    code = """def factorial(n):
    if n = 0:  # Syntax error
        return 1
    return n*factorial(n-1)
    """
    
    try:
        # Test comprehensive code review
        test_code = """
def process_data(data):
    result = []
    for i in range(len(data)):
        if data[i] > 0:
            result.append(data[i] * 2)
    return result
        """
        review_result = claude.review_and_fix_code(test_code)
        print("\nCode Review Results:")
        print("-" * 50)
        print(review_result)
        
        # Test code fixing
        fixed_file = claude.fix_code(code)
        print("\nFixed code:")
        print("-" * 50)
        print(fixed_file)
    except Exception as e:
        print(f"Error: {str(e)}")

        print("Claude's Response:\n")
        print(response)
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()
