
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
        
    def interact_with_claude(self, prompt, max_tokens=1000):
        """Interacts with Claude to process a prompt and return its response."""
        headers = {
            "anthropic-version": "2023-06-01",
            "x-api-key": self.api_key,
            "content-type": "application/json"
        }
        
        data = {
            "model": "claude-3-5-sonnet-20241022",
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
            
    def review_code(self, code):
        """Specialized method for code review"""
        prompt = f"You are a helpful AI assistant. Please review this code and suggest fixes:\n\n{code}"
        return self.interact_with_claude(prompt)
