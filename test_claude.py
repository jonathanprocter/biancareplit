
from services.claude_service import ClaudeService
import os

def main():
    try:
        claude = ClaudeService()
        
        # Test code focusing on deployment-critical components
        test_code = """
from flask import Flask
from server.index import app
from server.config import config

def create_app():
    app = Flask(__name__)
    app.config.from_object(config)
    
    @app.route('/')
    def health_check():
        return {"status": "healthy"}
        
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 3000)))
        """
        
        print("\nInitiating deployment readiness review with Claude...\n")
        review_result = claude.review_and_fix_code(test_code)
        
        print("Deployment Review Results:")
        print("-" * 50)
        print(review_result)
        
    except Exception as e:
        print(f"Error: {type(e).__name__}: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    main()
