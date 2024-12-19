
import os
from pathlib import Path

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'postgresql://postgres:postgres@0.0.0.0:5432/app_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    BASE_DIR = Path(__file__).resolve().parent.parent
    
    CORS_ORIGINS = [
        "http://0.0.0.0:3000",
        "http://0.0.0.0:3002",
        "http://0.0.0.0:3003"
    ]
    
    @classmethod
    def init_app(cls, app):
        app.config.from_object(cls)
