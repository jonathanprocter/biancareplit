import logging
from typing import Dict, List, Optional, Union
import html
import re
import asyncio
import aiohttp
import json
import os

logger = logging.getLogger(__name__)

class AICoach:
    def __init__(self):
        """Initialize the AI coach with configuration"""
        self.api_key = os.environ.get('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key not found in environment variables")
        
    async def get_response(self, question: str, context: List[Dict[str, str]] = None) -> Dict[str, Union[bool, str]]:
        """Get a formatted response from the AI coach"""
        try:
            # Format the response content
            response_content = await self._get_ai_response(question, context)
            formatted_content = self._format_response(response_content)
            
            return {
                'success': True,
                'response': formatted_content
            }
        except Exception as e:
            logger.error(f"Error getting AI response: {str(e)}")
            return {
                'success': False,
                'error': f"Failed to get AI response: {str(e)}"
            }

    def _format_response(self, content: str) -> str:
        """Format the response with proper HTML structure"""
        def format_inline_markup(text):
            """Convert markdown-style formatting to HTML tags"""
            # Convert bold with asterisks
            text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
            # Convert italics with single asterisks
            text = re.sub(r'\*([^*]+?)\*', r'<em>\1</em>', text)
            # Convert bold with underscores
            text = re.sub(r'__(.+?)__', r'<strong>\1</strong>', text)
            # Convert italics with single underscores
            text = re.sub(r'_([^_]+?)_', r'<em>\1</em>', text)
            return text

        def is_ordered_list_item(line):
            return bool(re.match(r'^\d+\.\s', line.strip()))
        
        def is_unordered_list_item(line):
            return bool(re.match(r'^[-*•]\s', line.strip()))

        def start_new_list(list_type):
            nonlocal in_list, current_list_type
            if in_list and current_list_items:
                processed_lines.append(f'<{current_list_type}>\n' + '\n'.join(current_list_items) + f'\n</{current_list_type}>')
                current_list_items.clear()
            in_list = True
            current_list_type = list_type

        lines = content.split('\n')
        processed_lines = []
        current_list_items = []
        in_list = False
        current_list_type = None
        
        for line in lines:
            stripped_line = line.strip()
            
            if not stripped_line:
                if in_list and current_list_items:
                    processed_lines.append(f'<{current_list_type}>\n' + '\n'.join(current_list_items) + f'\n</{current_list_type}>')
                    current_list_items = []
                    in_list = False
                    current_list_type = None
                continue
            
            if is_ordered_list_item(stripped_line):
                if not in_list or current_list_type != 'ol':
                    start_new_list('ol')
                
                # Format the content before removing the number
                formatted_line = format_inline_markup(stripped_line)
                item_content = re.sub(r'^\d+\.\s*', '', formatted_line)
                current_list_items.append(f'<li>{item_content}</li>')
                
            elif is_unordered_list_item(stripped_line):
                if not in_list or current_list_type != 'ul':
                    start_new_list('ul')
                
                formatted_line = format_inline_markup(stripped_line)
                item_content = re.sub(r'^[-*•]\s*', '', formatted_line)
                current_list_items.append(f'<li>{item_content}</li>')
            
            else:
                if in_list:
                    if current_list_items:
                        processed_lines.append(f'<{current_list_type}>\n' + '\n'.join(current_list_items) + f'\n</{current_list_type}>')
                    current_list_items = []
                    in_list = False
                    current_list_type = None
                
                formatted_line = format_inline_markup(stripped_line)
                if stripped_line.startswith('#'):
                    level = len(re.match(r'^#+', stripped_line).group())
                    content = formatted_line.lstrip('#').strip()
                    processed_lines.append(f'<h{level}>{content}</h{level}>')
                else:
                    processed_lines.append(f'<p>{formatted_line}</p>')
        
        # Handle any remaining list items
        if in_list and current_list_items:
            processed_lines.append(f'<{current_list_type}>\n' + '\n'.join(current_list_items) + f'\n</{current_list_type}>')
        
        return '\n'.join(processed_lines)
    
    async def _get_ai_response(self, question: str, context: Optional[List[Dict[str, str]]] = None) -> str:
        """Get response from OpenAI API"""
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            messages = []
            if context:
                messages.extend(context[-5:])  # Keep last 5 messages for context
            
            messages.append({
                'role': 'user',
                'content': question
            })
            
            data = {
                'model': 'gpt-4',
                'messages': messages,
                'temperature': 0.7,
                'max_tokens': 800
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post('https://api.openai.com/v1/chat/completions', 
                                     headers=headers, 
                                     json=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"API request failed: {error_text}")
                    
                    result = await response.json()
                    return result['choices'][0]['message']['content']
                    
        except Exception as e:
            logger.error(f"Error in AI response: {str(e)}")
            raise

    async def process_study_material(self, content: str) -> Dict[str, Union[bool, dict, str]]:
        """Process uploaded study material"""
        try:
            # Implementation for processing study material
            return {
                'success': True,
                'analysis': {
                    'keywords': [],
                    'learning_objectives': []
                }
            }
        except Exception as e:
            logger.error(f"Error processing study material: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
