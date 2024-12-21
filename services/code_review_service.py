import os
import logging
import json
import sys
from typing import Dict, Optional, List
from pathlib import Path
from openai import AsyncOpenAI, OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CodeReviewService:
    def __init__(self):
        """Initialize the code review service"""
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key not found in environment variables")

        try:
            # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
            # do not change this unless explicitly requested by the user
            self.client = OpenAI(api_key=self.api_key)
            logger.info("OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            raise

        # Supported file extensions and their languages
        self.supported_languages = {
            ".js": "JavaScript",
            ".ts": "TypeScript",
            ".tsx": "TypeScript React",
            ".jsx": "JavaScript React",
            ".py": "Python",
            ".css": "CSS",
            ".html": "HTML"
        }

    def review_file(self, file_path: Path) -> Dict:
        """Review a single file and return suggestions"""
        try:
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            extension = file_path.suffix
            language = self.supported_languages.get(extension)
            
            if not language:
                logger.warning(f"Unsupported file type: {extension}")
                return {"error": f"Unsupported file type: {extension}"}

            with open(file_path, 'r', encoding='utf-8') as file:
                code = file.read()

            # Create prompt for code review
            prompt = f"""Review this {language} code for:
            1. Bugs and potential errors
            2. Performance issues
            3. Security vulnerabilities
            4. Code style and best practices
            5. Integration problems
            6. Suggested improvements

            Provide response as JSON with:
            - issues: array of identified problems
            - suggestions: array of specific fixes
            - improved_code: complete fixed version
            - severity: high/medium/low for each issue

            Code to review:
            {code}
            """

            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{
                    "role": "system",
                    "content": "You are an expert code reviewer. Analyze code for issues and provide specific, actionable improvements."
                }, {
                    "role": "user",
                    "content": prompt
                }],
                response_format={ "type": "json_object" }
            )

            result = json.loads(response.choices[0].message.content)
            logger.info(f"Successfully reviewed {file_path}")
            return result

        except Exception as e:
            logger.error(f"Error reviewing file {file_path}: {str(e)}")
            return {"error": str(e)}

    def apply_fixes(self, file_path: Path, improved_code: str) -> bool:
        """Apply the suggested fixes to the file"""
        try:
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(improved_code)
            logger.info(f"Successfully applied fixes to {file_path}")
            return True
        except Exception as e:
            logger.error(f"Error applying fixes to {file_path}: {str(e)}")
            return False

    def review_directory(self, directory: str) -> Dict[str, Dict]:
        """Review all supported files in a directory recursively"""
        results = {}
        try:
            dir_path = Path(directory)
            if not dir_path.exists():
                raise FileNotFoundError(f"Directory not found: {directory}")
                
            for file_path in dir_path.rglob('*'):
                if file_path.is_file() and file_path.suffix in self.supported_languages:
                    if not any(exclude in str(file_path) for exclude in ['node_modules', '__pycache__', 'venv', '.git']):
                        logger.info(f"Reviewing {file_path}")
                        result = self.review_file(file_path)
                        if result and 'improved_code' in result:
                            self.apply_fixes(file_path, result['improved_code'])
                        results[str(file_path)] = result
            
            logger.info(f"Completed review of directory: {directory}")
            return results
        except Exception as e:
            error_msg = f"Error reviewing directory: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg}

def main():
    """Main function to handle command line execution"""
    try:
        if len(sys.argv) < 2:
            print(json.dumps({"error": "Please provide a directory path"}))
            sys.exit(1)

        directory = sys.argv[1]
        service = CodeReviewService()
        results = service.review_directory(directory)
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
