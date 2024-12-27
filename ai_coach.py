import os
import re

import requests

BOLD_ASTERISKS_RE = re.compile(r"\*\*(.*?)\*\*")
ITALICS_SINGLE_ASTERISKS_RE = re.compile(r"\*([^*]+?)\*")
BOLD_UNDERSCORES_RE = re.compile(r"__(.+?)__")
ITALICS_SINGLE_UNDERSCORES_RE = re.compile(r"_([^_]+?)_")
ORDERED_LIST_RE = re.compile(r"^\d+\.\s")
UNORDERED_LIST_RE = re.compile(r"^[-*•]\s")
HASH_RE = re.compile(r"^#+")


class AICoach:
    def __init__(self, api_key):
        """Initialize the AI coach with configuration"""
        if not api_key:
            raise ValueError("OpenAI API key not provided")
        self.api_key = api_key

    @staticmethod
    def format_inline_markup(text):
        text = BOLD_ASTERISKS_RE.sub(r"<strong>\1</strong>", text)
        text = ITALICS_SINGLE_ASTERISKS_RE.sub(r"<em>\1</em>", text)
        text = BOLD_UNDERSCORES_RE.sub(r"<strong>\1</strong>", text)
        text = ITALICS_SINGLE_UNDERSCORES_RE.sub(r"<em>\1</em>", text)
        return text

    @staticmethod
    def is_ordered_list_item(line):
        return bool(ORDERED_LIST_RE.match(line.strip()))

    @staticmethod
    def is_unordered_list_item(line):
        return bool(UNORDERED_LIST_RE.match(line.strip()))

    # Continue with other methods...


def main():
    # When creating the AICoach, provide the API key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OpenAI API key not found in environment variables")
    ai_coach = AICoach(api_key)


if __name__ == "__main__":
    main()
