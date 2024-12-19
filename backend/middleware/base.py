
from abc import ABC, abstractmethod
from flask import Flask

class BaseMiddleware(ABC):
    """Base class for all middleware components"""
    
    @abstractmethod
    def initialize(self, app: Flask) -> None:
        """Initialize the middleware with Flask app instance"""
        pass
        
    @abstractmethod
    def process_request(self, request) -> None:
        """Process incoming request"""
        pass
        
    @abstractmethod
    def process_response(self, response) -> None:
        """Process outgoing response"""
        pass
