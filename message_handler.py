from datetime import datetime
import json
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict


@dataclass
class Message:
    content: str
    role: str
    timestamp: str
    metadata: Optional[Dict] = None


class MessageHandler:
    def __init__(self):
        self.history: Dict[str, Dict] = {}

    def add_conversation(self, user_id: str) -> None:
        """Initialize a new conversation for a user"""
        self.history[user_id] = {
            "messages": [],
            "started_at": datetime.now().isoformat(),
            "last_interaction": datetime.now().isoformat(),
        }

    def add_message(
        self, user_id: str, content: str, role: str = "user", metadata: Dict = None
    ) -> None:
        """Add a message to the user's conversation history"""
        if user_id not in self.history:
            self.add_conversation(user_id)

        message = Message(
            content=content,
            role=role,
            timestamp=datetime.now().isoformat(),
            metadata=metadata,
        )

        self.history[user_id]["messages"].append(asdict(message))
        self.history[user_id]["last_interaction"] = datetime.now().isoformat()

    def get_context(self, user_id: str, limit: int = 5) -> List[Dict]:
        """Get recent conversation context for a user"""
        if user_id not in self.history:
            return []
        return self.history[user_id]["messages"][-limit:]

    def clear_history(self, user_id: str) -> None:
        """Clear a user's conversation history"""
        if user_id in self.history:
            self.history[user_id]["messages"] = []
            self.history[user_id]["last_interaction"] = datetime.now().isoformat()


message_handler = MessageHandler()
