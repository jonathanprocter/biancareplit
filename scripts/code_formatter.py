import os
import subprocess
import time
from typing import Optional, List, Dict
import json

# Supported file extensions and their corresponding formatters
# For now, focus only on Python files to avoid timeout issues
SUPPORTED_LANGUAGES = {
    ".py": {
        "name": "Python",
        "formatters": ["black", "flake8"],
        "priority": 1
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

def should_process_file(file_path: str) -> bool:
    """
    Determines if a file should be processed based on patterns.
    Focus on main Python source files.
    """
    exclude_patterns = {
        'generated', 'vendor', 'dist', 'build',
        'test', 'mock', 'fixture', 'migrations',
        'coverage', '__pycache__', 'venv',
        '.pytest_cache', '__init__'
    }
    
    file_lower = file_path.lower()
    return not any(pattern in file_lower for pattern in exclude_patterns)

def process_directory(directory: str, batch_size: int = 2) -> None:
    """
    Recursively processes files in very small batches, prioritizing by file type.
    """
    excluded_dirs = {
        'node_modules', 'venv', '.git', '__pycache__', 
        'build', 'dist', 'coverage', '.next', 'migrations',
        '.pytest_cache', '__snapshots__', '.husky'
    }
    
    files_by_priority = {}
    processed_count = 0
    total_eligible_files = 0
    
    # First collect and categorize files
    for root, dirs, files in os.walk(directory):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in excluded_dirs]
        
        for file_name in files:
            file_path = os.path.join(root, file_name)
            
            if not should_process_file(file_path):
                continue
                
            language_config = detect_language(file_path)
            if language_config:
                priority = language_config.get('priority', 999)
                if priority not in files_by_priority:
                    files_by_priority[priority] = []
                files_by_priority[priority].append(file_path)
                total_eligible_files += 1

    if total_eligible_files == 0:
        print("No eligible files found to format.")
        return
        
    print(f"\nFound {total_eligible_files} files to format")
        
    # Process files by priority
    for priority in sorted(files_by_priority.keys()):
        files = files_by_priority[priority]
        total_files = len(files)
        
        if total_files == 0:
            continue
            
        print(f"\nProcessing {total_files} files with priority {priority}")
        
        for i in range(0, total_files, batch_size):
            batch = files[i:i + batch_size]
            current_batch = i // batch_size + 1
            total_batches = (total_files + batch_size - 1) // batch_size
            
            print(f"\nBatch {current_batch}/{total_batches}", end="", flush=True)
            
            for file_path in batch:
                language_config = detect_language(file_path)
                try:
                    apply_formatters(file_path, language_config)
                    processed_count += 1
                    print(f"\rProgress: {processed_count}/{total_eligible_files} files", end="", flush=True)
                except Exception as e:
                    print(f"\nError processing {os.path.basename(file_path)}: {str(e)}")
            time.sleep(1) #Added a 1-second pause between batches
            print(f"\nCompleted batch {current_batch}")
            # Add a small pause between batches to prevent timeouts
            time.sleep(0.5)

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