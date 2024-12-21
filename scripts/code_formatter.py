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
    file_name = os.path.basename(file_path)
    print(f"Formatting {file_name}...", end=" ", flush=True)
    
    for formatter in language_config["formatters"]:
        try:
            if formatter == "black":
                subprocess.run(["black", "-q", file_path], check=True)
            elif formatter == "flake8":
                result = subprocess.run(["flake8", file_path], capture_output=True, text=True)
                if result.returncode != 0:
                    print(f"\n⚠ Flake8 issues in {file_name}:")
                    print(result.stdout.strip())
            elif formatter == "prettier":
                subprocess.run(["npx", "prettier", "--loglevel=error", "--write", file_path], check=True)
            elif formatter == "eslint":
                subprocess.run(["npx", "eslint", "--quiet", "--fix", file_path], check=True)
        except subprocess.CalledProcessError as e:
            print(f"\n⚠ {formatter} failed on {file_name}")
            if e.stderr:
                print(e.stderr.decode().strip())
    
    print("✓")

def process_directory(directory: str, batch_size: int = 10) -> None:
    """
    Recursively processes files in batches to avoid timeout issues.
    """
    excluded_dirs = {
        'node_modules', 'venv', '.git', '__pycache__', 
        'build', 'dist', 'coverage'
    }
    
    files_to_process = []
    
    # First collect all files
    for root, dirs, files in os.walk(directory):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in excluded_dirs]
        
        for file_name in files:
            file_path = os.path.join(root, file_name)
            if detect_language(file_path):
                files_to_process.append(file_path)

    # Then process in batches
    total_files = len(files_to_process)
    print(f"\nFound {total_files} files to format")
    
    for i in range(0, total_files, batch_size):
        batch = files_to_process[i:i + batch_size]
        print(f"\nProcessing batch {i//batch_size + 1} of {(total_files + batch_size - 1)//batch_size}")
        
        for file_path in batch:
            language_config = detect_language(file_path)
            try:
                apply_formatters(file_path, language_config)
            except Exception as e:
                print(f"Error processing {file_path}: {str(e)}")
        
        print(f"Completed batch {i//batch_size + 1}")

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
