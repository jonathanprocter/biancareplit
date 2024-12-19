#!/usr/bin/env python3
"""Test configuration system functionality."""
import os
import sys
from pathlib import Path
import logging

# Add project root to Python path
project_root = str(Path(__file__).parent.parent.absolute())
sys.path.insert(0, project_root)

from backend.config.config_manager import config_manager
from flask import Flask

def test_configuration():
    """Test configuration initialization and verification."""
    try:
        # Initialize configuration
        init_status = config_manager.initialize_config()
        if not init_status:
            print("❌ Configuration initialization failed")
            return {"initialization": False}
            
        # Verify system state
        status = config_manager.verify_system()
        
        print("\nSystem Configuration Status:")
        for check, state in status.items():
            print(f"{check}: {'✓' if state else '✗'}")
            
        # Test Flask integration
        app = Flask(__name__)
        config_manager.init_app(app)
        
        print("\nFlask Configuration:")
        print(f"Debug Mode: {app.config['DEBUG']}")
        print(f"Database URL: {app.config['SQLALCHEMY_DATABASE_URI']}")
        
        status["flask_integration"] = True
        return status
        
    except Exception as e:
        print(f"\n❌ Configuration test failed: {str(e)}")
        return {"error": False}

if __name__ == "__main__":
    results = test_configuration()
    if results and all(results.values()):
        print("\n✅ Configuration system working correctly")
        sys.exit(0)
    else:
        print("\n❌ Configuration system needs attention")
        sys.exit(1)
