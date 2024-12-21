"""Base configuration for the NCLEX coaching platform."""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
import os
from pathlib import Path
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class MiddlewareConfig:
    """Base middleware configuration."""

    name: str
    enabled: bool = True
    order: int = 0
    description: str = ""
    settings: Dict[str, Any] = field(default_factory=dict)
    dependencies: List[str] = field(default_factory=list)

    def validate(self) -> bool:
        """Validate middleware configuration."""
        return True


@dataclass
class ApplicationConfig:
    """Base application configuration."""

    # Application identity
    APP_NAME: str = "NCLEX Coaching Platform"
    APP_VERSION: str = "1.0.0"

    # Environment
    ENV: str = field(default_factory=lambda: os.getenv("FLASK_ENV", "development"))
    DEBUG: bool = False
    TESTING: bool = False

    # Security
    SECRET_KEY: str = field(
        default_factory=lambda: os.getenv("SECRET_KEY", "dev-key-CHANGE-IN-PRODUCTION")
    )

    # Database configuration
    SQLALCHEMY_DATABASE_URI: str = field(
        default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///app.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: Dict[str, Any] = field(
        default_factory=lambda: {
            "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
            "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
            "pool_recycle": 300,
            "pool_pre_ping": True,
        }
    )

    # Paths
    BASE_DIR: Path = Path(__file__).parent.parent
    CONFIG_DIR: Path = BASE_DIR / "config"
    LOG_DIR: Path = BASE_DIR / "logs"

    # Middleware configuration
    MIDDLEWARE_CONFIGS: Dict[str, MiddlewareConfig] = field(default_factory=dict)

    def __post_init__(self):
        """Initialize configuration after instantiation."""
        self._setup_paths()
        self._init_middleware_configs()
        self._validate()

    def _setup_paths(self):
        """Ensure required paths exist."""
        self.CONFIG_DIR.mkdir(exist_ok=True)
        self.LOG_DIR.mkdir(exist_ok=True)

    def _init_middleware_configs(self):
        """Initialize default middleware configurations."""
        if not self.MIDDLEWARE_CONFIGS:
            self.MIDDLEWARE_CONFIGS = {
                "security": MiddlewareConfig(
                    name="security",
                    order=1,
                    description="Security middleware for request validation and headers",
                ),
                "logging": MiddlewareConfig(
                    name="logging",
                    order=2,
                    description="Logging middleware for request tracking",
                ),
                "metrics": MiddlewareConfig(
                    name="metrics", order=3, description="Metrics collection middleware"
                ),
                "cache": MiddlewareConfig(
                    name="cache", order=4, description="Caching middleware"
                ),
            }

    def _validate(self):
        """Validate configuration."""
        if self.ENV == "production":
            assert (
                self.SECRET_KEY != "dev-key-CHANGE-IN-PRODUCTION"
            ), "Production environment requires a secure SECRET_KEY"
            assert (
                self.SQLALCHEMY_DATABASE_URI != "sqlite:///app.db"
            ), "Production environment requires a proper database URL"


class DevelopmentConfig(ApplicationConfig):
    """Development environment configuration."""

    DEBUG: bool = True

    def __post_init__(self):
        super().__post_init__()
        self.MIDDLEWARE_CONFIGS["logging"].settings.update(
            {"level": "DEBUG", "console_enabled": True, "file_enabled": True}
        )


class ProductionConfig(ApplicationConfig):
    """Production environment configuration."""

    def __post_init__(self):
        super().__post_init__()
        self.MIDDLEWARE_CONFIGS["logging"].settings.update(
            {"level": "INFO", "console_enabled": False, "file_enabled": True}
        )
        self.MIDDLEWARE_CONFIGS["security"].settings.update(
            {"force_https": True, "strict_slashes": False}
        )


class TestingConfig(ApplicationConfig):
    """Testing environment configuration."""

    TESTING: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"


def get_config() -> ApplicationConfig:
    """Get configuration instance based on environment."""
    env = os.getenv("FLASK_ENV", "development").lower()
    config_map = {
        "development": DevelopmentConfig,
        "production": ProductionConfig,
        "testing": TestingConfig,
    }
    config_class = config_map.get(env, DevelopmentConfig)
    logger.info(f"Using {config_class.__name__} configuration")
    return config_class()
