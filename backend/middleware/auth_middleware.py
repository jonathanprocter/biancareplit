from functools import wraps
from flask import request, jsonify, g
import jwt
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class AuthMiddleware:
    def __init__(self, app=None, secret_key=None):
        if app is None:
            raise ValueError("app cannot be None")
        if secret_key is None:
            secret_key = app.config.get("SECRET_KEY")
        if secret_key is None:
            raise ValueError("secret_key cannot be None")
        self.app = app
        self.secret_key = secret_key

    def authenticate(self):
        def decorator(f):
            @wraps(f)
            def wrapped(*args, **kwargs):
                token = request.headers.get("Authorization")

                if not token:
                    return jsonify({"message": "Missing token"}), 401

                try:
                    token = token.split(" ")[1]
                    data = jwt.decode(token, self.secret_key, algorithms=["HS256"])
                    g.user = data
                    return f(*args, **kwargs)
                except jwt.ExpiredSignatureError:
                    return jsonify({"message": "Token expired"}), 401
                except jwt.InvalidTokenError:
                    return jsonify({"message": "Invalid token"}), 401
                except Exception as e:
                    logger.error(f"Authentication error: {str(e)}")
                    return jsonify({"message": "Authentication failed"}), 401

            return wrapped

        return decorator
