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

def test_error_handling():
    """Test configuration error handling."""
    with pytest.raises(ConfigurationError):
        # Attempt to get config before initialization
        config_manager._initialized = False
        config_manager.get("NON_EXISTENT_KEY")

def test_required_env_vars():
    """Test required environment variables validation."""
    # Temporarily remove required env var
    original_db_url = os.environ.get("DATABASE_URL")
    if "DATABASE_URL" in os.environ:
        del os.environ["DATABASE_URL"]

    try:
        with pytest.raises(ConfigurationError):
            config_manager._load_base_config()
    finally:
        # Restore environment variable
        if original_db_url:
            os.environ["DATABASE_URL"] = original_db_url

if __name__ == "__main__":
    pytest.main([__file__, "-v"])