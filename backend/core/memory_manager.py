
from typing import Dict, List, Any
from datetime import datetime

class ProcessMemoryManager:
    def __init__(self):
        self.interactions: List[Dict[str, Any]] = []
        self.context: Dict[str, Any] = {}
        
    def add_interaction(self, interaction_type: str, data: Dict[str, Any]) -> None:
        """Store an interaction with timestamp"""
        self.interactions.append({
            "type": interaction_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    def get_recent_interactions(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get most recent interactions"""
        return self.interactions[-limit:]
        
    def update_context(self, key: str, value: Any) -> None:
        """Update context with new information"""
        self.context[key] = value
        
    def get_context(self) -> Dict[str, Any]:
        """Get current context"""
        return self.context

process_memory = ProcessMemoryManager()
