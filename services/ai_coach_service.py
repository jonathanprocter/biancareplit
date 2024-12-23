import openai
from datetime import datetime, timedelta
from models import CyberContent


from backend.core.memory_manager import process_memory

class AICoachService:
    def __init__(self):
        self.model = "gpt-4"
        self.memory = process_memory
        self.context = {
            "role": "system",
            "content": """You are an expert cybersecurity tutor. Help students understand:
            - Network Security fundamentals
            - Cryptography concepts
            - Security protocols
            - Threat analysis
            - Security compliance
            Provide practical, real-world examples.""",
        }

    async def generate_response(self, user_input, topic):
        try:
            completion = await openai.ChatCompletion.create(
                model=self.model,
                messages=[self.context, {"role": "user", "content": user_input}],
            )
            return completion.choices[0].message["content"]
        except Exception as e:
            return f"Error generating response: {str(e)}"
