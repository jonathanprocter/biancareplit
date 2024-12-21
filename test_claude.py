
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


    # Example code review
    code = """def factorial(n):
    if n = 0:  # Syntax error
        return 1
    return n*factorial(n-1)
    """
    
    try:
        # Test code fixing
        fixed_file = claude.fix_code(code)
        print("Fixed code:\n", fixed_file)
    except Exception as e:
        print(f"Error: {str(e)}")

        print("Claude's Response:\n")
        print(response)
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()
