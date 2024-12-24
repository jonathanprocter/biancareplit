"""Test configuration management system."""

import os
import pytest
from config import config_manager, ConfigurationError
from flask import Flask

def test_config_initialization():
    """Test basic configuration initialization."""
    # Test singleton pattern
    config1 = config_manager
    config2 = config_manager
    assert config1 is config2

    # Test basic config values
    assert config_manager.get("ENV") in ["development", "production", "testing"]
    assert isinstance(config_manager.get("DEBUG"), bool)
    assert config_manager.get("SQLALCHEMY_TRACK_MODIFICATIONS") is False

def test_flask_integration():
    """Test Flask application integration."""
    app = Flask(__name__)
    config_manager.init_app(app)
    
    # Verify Flask config
    assert app.config["ENV"] == config_manager.get("ENV")
    assert app.config["DEBUG"] == config_manager.get("DEBUG")
    assert "SQLALCHEMY_DATABASE_URI" in app.config

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
