import os
from pathlib import Path
from flask_cors import CORS
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
CORS(app)
db = SQLAlchemy()


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-key-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/app_db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    BASE_DIR = Path(__file__).resolve().parent.parent
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:3003",
    ]

    @staticmethod
    def init_app(app):
        app.config.from_object(Config)
        CORS(app, resources={r"/*": {"origins": Config.CORS_ORIGINS}})


def create_app():
    app = Flask(__name__)
    Config.init_app(app)
    db.init_app(app)
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000)
