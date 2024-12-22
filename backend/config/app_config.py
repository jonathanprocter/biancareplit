import os
from pathlib import Path
from flask_cors import CORS


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-key-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql://postgres:postgres@0.0.0.0:5432/app_db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    BASE_DIR = Path(__file__).resolve().parent.parent

    CORS_ORIGINS = ["http://0.0.0.0:3000", "http://0.0.0.0:3002", "http://0.0.0.0:3003"]

    @staticmethod
    def init_app(app):
        app.config.from_object(Config)
        CORS(app, resources={r"/*": {"origins": Config.CORS_ORIGINS}})
