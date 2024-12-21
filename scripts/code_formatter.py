import os
import subprocess
import requests
from typing import Optional, List, Dict
import json

# Supported file extensions and their corresponding formatters
SUPPORTED_LANGUAGES = {
    ".py": {
        "name": "Python",
        "formatters": ["black", "flake8"]
    },
    ".js": {
        "name": "JavaScript",
        "formatters": ["prettier", "eslint"]
    },
    ".ts": {
        "name": "TypeScript",
        "formatters": ["prettier", "eslint"]
    },
    ".tsx": {
        "name": "TypeScript React",
        "formatters": ["prettier", "eslint"]
    },
    ".jsx": {
        "name": "JavaScript React",
        "formatters": ["prettier", "eslint"]
    },
    ".css": {
        "name": "CSS",
        "formatters": ["prettier"]
    },
    ".json": {
        "name": "JSON",
        "formatters": ["prettier"]
    }
}

def detect_language(file_path: str) -> Optional[Dict]:
    """
    Detects the language configuration based on file extension.
    """
    _, ext = os.path.splitext(file_path)
    return SUPPORTED_LANGUAGES.get(ext)

def apply_formatters(file_path: str, language_config: Dict) -> None:
    """
    Applies appropriate formatters based on the language configuration.
    """
    print(f"\nFormatting {file_path} ({language_config['name']})...")
    
    for formatter in language_config["formatters"]:
        try:
            if formatter == "black":
                subprocess.run(["black", file_path], check=True)
                print(f"✓ Black formatting completed for {file_path}")
            
            elif formatter == "flake8":
                result = subprocess.run(["flake8", file_path], capture_output=True, text=True)
                if result.returncode != 0:
                    print(f"⚠ Flake8 found issues in {file_path}:")
                    print(result.stdout)
                else:
                    print(f"✓ Flake8 check passed for {file_path}")
            
            elif formatter == "prettier":
                subprocess.run(["npx", "prettier", "--write", file_path], check=True)
                print(f"✓ Prettier formatting completed for {file_path}")
            
            elif formatter == "eslint":
                subprocess.run(["npx", "eslint", "--fix", file_path], check=True)
                print(f"✓ ESLint formatting completed for {file_path}")
                
        except subprocess.CalledProcessError as e:
            print(f"⚠ Error running {formatter} on {file_path}:")
            print(e.stderr if e.stderr else e)

def process_directory(directory: str) -> None:
    """
    Recursively processes all supported files in the project directory.
    """
    excluded_dirs = {
        'node_modules', 'venv', '.git', '__pycache__', 
        'build', 'dist', 'coverage'
    }
    
    for root, dirs, files in os.walk(directory):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in excluded_dirs]
        
        for file_name in files:
            file_path = os.path.join(root, file_name)
            language_config = detect_language(file_path)
            
            if language_config:
                try:
                    apply_formatters(file_path, language_config)
                except Exception as e:
                    print(f"Error processing {file_path}: {str(e)}")

def main():
    """
    Main entry point for the code formatting script.
    """
    print("🔍 Starting code formatting process...")
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    print(f"Processing files in: {project_root}")
    process_directory(project_root)
    print("\n✨ Code formatting complete!")

if __name__ == "__main__":
    main()
