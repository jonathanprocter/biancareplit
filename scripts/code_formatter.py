"""Code formatting utility for the project."""

import os
import subprocess
import time
from typing import Dict, Optional

# Supported file extensions and their corresponding formatters
# For now, focus only on Python files to avoid timeout issues
SUPPORTED_LANGUAGES = {
    ".py": {"name": "Python", "formatters": ["black", "flake8"], "priority": 1}
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
                result = subprocess.run(
                    ["flake8", file_path], capture_output=True, text=True
                )
                if result.returncode != 0:
                    print(f"\n⚠ Flake8 issues in {file_name}:")
                    print(result.stdout.strip())
            elif formatter == "prettier":
                subprocess.run(
                    ["npx", "prettier", "--loglevel=error", "--write", file_path],
                    check=True,
                )
            elif formatter == "eslint":
                subprocess.run(
                    ["npx", "eslint", "--quiet", "--fix", file_path], check=True
                )
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
    _, ext = os.path.splitext(file_path)
    return ext == ".py"


def process_directory(directory: str, batch_size: int = 1) -> None:
    """
    Processes only the most important Python files in specific directories.
    """
    # Only process files in these directories
    included_dirs = {"", "scripts", "server", "db", "routes"}  # root directory
    files_to_process = []
    for root, _, files in os.walk(directory):
        rel_path = os.path.relpath(root, directory)
        parts = rel_path.split(os.sep)
        if any(part in included_dirs for part in parts):
            for file in files:
                file_path = os.path.join(root, file)
                if should_process_file(file_path):
                    files_to_process.append(file_path)

    if not files_to_process:
        print("No eligible files found to format.")
        return

    print(f"\nFound {len(files_to_process)} files to format")
    processed_count = 0
    total_files = len(files_to_process)

    for i in range(0, total_files, batch_size):
        batch = files_to_process[i : i + batch_size]
        current_batch = i // batch_size + 1
        total_batches = (total_files + batch_size - 1) // batch_size

        print(f"\nBatch {current_batch}/{total_batches}", end="", flush=True)

        for file_path in batch:
            language_config = detect_language(file_path)
            try:
                apply_formatters(file_path, language_config)
                processed_count += 1
                print(
                    f"\rProgress: {processed_count}/{total_files} files",
                    end="",
                    flush=True,
                )
            except Exception as e:
                print(f"\nError processing {os.path.basename(file_path)}: {str(e)}")

        # Add pause between batches to prevent timeouts
        time.sleep(1)
        print(f"\nCompleted batch {current_batch}")
        # Small additional pause for stability
        time.sleep(0.5)


def main() -> None:
    """Main entry point for the code formatting script."""
    print("🔍 Starting code formatting process...")
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    print(f"Processing files in: {project_root}")
    process_directory(project_root)
    print("\n✨ Code formatting complete!")


if __name__ == "__main__":
    main()
