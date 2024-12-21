
import requests
import os
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class ClaudeService:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            logger.error("Anthropic API key not found")
            raise ValueError("Anthropic API key not found in environment variables")
            
        self.api_url = "https://api.anthropic.com/v1/complete"
        
    def interact_with_claude(self, prompt, max_tokens=1000):
        """Interacts with Claude to process a prompt and return its response."""
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        data = {
            "model": "claude-2.1",
            "prompt": prompt,
            "max_tokens_to_sample": max_tokens
        }

        try:
            response = requests.post(self.api_url, headers=headers, json=data)
            response.raise_for_status()
            return response.json()["completion"]
        except requests.exceptions.RequestException as e:
            logger.error(f"Claude API request failed: {str(e)}")
            raise
            
    def review_code(self, code):
        """Specialized method for code review"""
        prompt = f"You are a helpful AI assistant. Please review this code and suggest fixes:\n\n{code}"
        return self.interact_with_claude(prompt)
