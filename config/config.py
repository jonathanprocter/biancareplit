import os
from pathlib import Path


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-key-12345"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or "sqlite:///app.db"
    SERVER_NAME = None
    PREFERRED_URL_SCHEME = "http"

    @staticmethod
    def init_app(app):
        app.config["PROPAGATE_EXCEPTIONS"] = True


class DevelopmentConfig(Config):
    DEBUG = True
    ENV = "development"
    USE_RELOADER = True


class ProductionConfig(Config):
    DEBUG = False
    ENV = "production"


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
