
import requests
import os
import logging

logger = logging.getLogger(__name__)

class ClaudeService:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            logger.error("Anthropic API key not found")
            raise ValueError("Anthropic API key not found in environment variables")
            
        self.api_url = "https://api.anthropic.com/v1/messages"
        
    def fix_code(self, code_snippet, max_tokens=2000):
        """Sends code to Claude and requests a fixed version."""
        prompt = f"""You are a skilled programmer. Please review, fix, and optimize the following code for deployment:

```python
{code_snippet}
```

Return only the corrected code ready for production deployment without any explanation."""

        headers = {
            "anthropic-version": "2023-06-01",
            "x-api-key": self.api_key,
            "content-type": "application/json"
        }
        
        data = {
            "model": "claude-3-sonnet-20240229",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens
        }

        try:
            response = requests.post(self.api_url, headers=headers, json=data)
            response.raise_for_status()
            return response.json()["content"][0]["text"]
        except requests.exceptions.RequestException as e:
            logger.error(f"Claude API request failed: {str(e)}")
            raise

if __name__ == "__main__":
    claude = ClaudeService()
    
    print("Enter the code snippet to be fixed (end input with Ctrl+D):")
    try:
        code_snippet = ""
        while True:
            line = input()
            code_snippet += line + "\n"
    except EOFError:
        pass

    try:
        fixed_code = claude.fix_code(code_snippet)
        print("\nFixed Code:\n")
        print(fixed_code)

        with open("fixed_code.py", "w") as file:
            file.write(fixed_code)
        print("\nThe fixed code has been saved to 'fixed_code.py'.")
    except Exception as e:
        print(f"Error: {str(e)}")



    def fix_code_from_file(self, file_path: str, max_tokens=2000) -> str:
        """Reads code from a file and sends it to Claude for fixing."""
        try:
            with open(file_path, "r") as file:
                code_snippet = file.read()
            fixed_code = self.fix_code(code_snippet, max_tokens)
            
            # Save the fixed code to a new file
            fixed_file_path = file_path.replace(".py", "_fixed.py")
            with open(fixed_file_path, "w") as fixed_file:
                fixed_file.write(fixed_code)
            logger.info(f"Fixed code saved to: {fixed_file_path}")
            return fixed_file_path
        except Exception as e:
            logger.error(f"Error fixing code from file: {str(e)}")
            raise

    def deploy_code(self, file_path: str) -> bool:
        """Deploys the fixed code using Python interpreter."""
        try:
            logger.info("Starting deployment process...")
            result = subprocess.run(
                ["python3", file_path], 
                capture_output=True, 
                text=True
            )
            
            if result.returncode == 0:
                logger.info("Deployment completed successfully")
                return True
            else:
                logger.error(f"Deployment failed: {result.stderr}")
                return False
        except Exception as e:
            logger.error(f"Deployment error: {str(e)}")
            raise
