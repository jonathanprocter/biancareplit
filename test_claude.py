import glob

from services.claude_service import ClaudeService


def get_all_code_files():
    """Get all relevant code files for review."""
    extensions = [".py", ".ts", ".tsx", ".js", ".jsx"]
    files = []
    for ext in extensions:
        files.extend(glob.glob(f"**/*{ext}", recursive=True))
    return files


def main():
    try:
        claude = ClaudeService()
        files = get_all_code_files()

        print("\nInitiating comprehensive codebase review with Claude...\n")

        for file_path in files:
            try:
                with open(file_path, "r") as f:
                    code = f.read()
                    if code.strip():
                        print(f"\nAnalyzing {file_path}...")
                        review_result = claude.review_and_fix_code(code)
                        print(f"\nReview Results for {file_path}:")
                        print("-" * 50)
                        print(review_result)
                        print("-" * 50)
            except Exception as e:
                print(f"Error reviewing {file_path}: {str(e)}")
                continue

    except Exception as e:
        print(f"Error: {type(e).__name__}: {str(e)}")
        import traceback

        print(traceback.format_exc())


if __name__ == "__main__":
    main()
