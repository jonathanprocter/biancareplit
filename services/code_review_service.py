import asyncio
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from openai import OpenAI, OpenAIError

logger = logging.getLogger(__name__)


class CodeReviewService:
    def __init__(self):
        self.client = OpenAI()
        self.last_api_call = 0
        self.min_delay = 1.0
        self.batch_size = 5
        self.max_file_size = 100 * 1024
        self.api_timeout = 60.0

        self.fix_patterns = {
            "unused_imports": (
                r"^import\s+([^\s]+)(?:\s+as\s+[^\s]+)?\s*$",
                lambda m, content: (
                    "" if self._is_unused(m.group(1), content) else m.group(0)
                ),
            ),
            "trailing_whitespace": (r"[ \t]+$", ""),
            "multiple_blank_lines": (r"\n{3,}", "\n\n"),
            "missing_type_hints": (
                r"def\s+([^\(]+)\(([^\)]*)\)(?!\s*->)",
                lambda m: f"def {m.group(1)}({m.group(2)}) -> Any",
            ),
        }

    async def apply_automated_fixes(self, file_path: str, content: str) -> str:
        """Apply automated fixes to code."""
        try:
            fixed_content = content
            for fix_name, (pattern, replacement) in self.fix_patterns.items():
                if callable(replacement):
                    fixed_content = self._apply_callable_fix(
                        fixed_content, pattern, replacement
                    )
                else:
                    fixed_content = self._apply_simple_fix(
                        fixed_content, pattern, replacement
                    )

            return fixed_content
        except Exception as e:
            logger.error(f"Error applying fixes to {file_path}: {str(e)}")
            return content

    def _apply_simple_fix(self, content: str, pattern: str, replacement: str) -> str:
        import re

        return re.sub(pattern, replacement, content, flags=re.MULTILINE)

    def _apply_callable_fix(self, content: str, pattern: str, replacement_func) -> str:
        import re

        lines = content.splitlines()
        fixed_lines = []
        for line in lines:
            match = re.match(pattern, line)
            if match:
                fixed_line = replacement_func(match, content)
                if fixed_line is not None:
                    fixed_lines.append(fixed_line)
            else:
                fixed_lines.append(line)
        return "\n".join(fixed_lines)

    async def process_directory(self, directory: str) -> Dict[str, Any]:
        results = {
            "status": "in_progress",
            "files": {},
            "fixed": [],
            "failed": [],
            "skipped": [],
            "stats": {"processed": 0, "fixes_applied": 0, "errors": 0},
        }

        try:
            for root, _, files in os.walk(directory):
                for file in files:
                    if file.endswith((".py", ".ts", ".tsx", ".js", ".jsx")):
                        file_path = os.path.join(root, file)
                        try:
                            with open(file_path, "r") as f:
                                content = f.read()

                            # Apply automated fixes
                            fixed_content = await self.apply_automated_fixes(
                                file_path, content
                            )

                            if fixed_content != content:
                                with open(file_path, "w") as f:
                                    f.write(fixed_content)
                                results["fixed"].append(file_path)
                                results["stats"]["fixes_applied"] += 1

                            results["stats"]["processed"] += 1

                        except Exception as e:
                            logger.error(f"Error processing {file_path}: {str(e)}")
                            results["failed"].append(file_path)
                            results["stats"]["errors"] += 1

            results["status"] = "completed"
            return results

        except Exception as e:
            logger.error(f"Error processing directory: {str(e)}")
            results["status"] = "failed"
            return results
