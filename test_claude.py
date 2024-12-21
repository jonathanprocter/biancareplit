
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
        print("Claude's Response:\n")
        print(response)
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()
