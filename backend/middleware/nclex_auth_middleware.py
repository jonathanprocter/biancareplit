"""Authentication middleware for NCLEX platform."""

from functools import wraps
from flask import request, g, jsonify
import jwt
import logging
from datetime import datetime, timedelta
from typing import Callable, Optional
from backend.database.core import db_manager
from backend.config.secure_config import config_manager

logger = logging.getLogger(__name__)


def get_token_from_request() -> Optional[str]:
    """Extract JWT token from request headers."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    return None


def validate_token(token: str) -> dict:
    """Validate JWT token and return payload."""
    try:
        config = config_manager.get_config()
        payload = jwt.decode(token, config.get("JWT_SECRET_KEY"), algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Expired token attempt", extra={"token": token[:10]})
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}", extra={"token": token[:10]})
        raise ValueError("Invalid token")


def require_auth(f: Callable) -> Callable:
    """Middleware decorator to require authentication."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_request()

        if not token:
            logger.warning("Missing authentication token")
            return jsonify({"error": "Missing authentication token"}), 401

        try:
            # Validate token and store user info
            payload = validate_token(token)
            g.user_id = payload.get("user_id")
            g.user_role = payload.get("role", "student")

            # Execute the route handler
            return f(*args, **kwargs)

        except ValueError as e:
            return jsonify({"error": str(e)}), 401

    return decorated_function


def require_role(required_role: str) -> Callable:
    """Middleware decorator to require specific role."""

    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, "user_role"):
                logger.warning("No user role found in request context")
                return jsonify({"error": "Authentication required"}), 401

            if g.user_role != required_role:
                logger.warning(
                    "Insufficient permissions",
                    extra={"required_role": required_role, "user_role": g.user_role},
                )
                return jsonify({"error": "Insufficient permissions"}), 403

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def create_token(user_id: int, role: str = "student") -> str:
    """Create a new JWT token."""
    config = config_manager.get_config()
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=1),
    }
    return jwt.encode(payload, config.get("JWT_SECRET_KEY"), algorithm="HS256").decode(
        "utf-8"
    )


def init_auth(app):
    """Initialize authentication middleware."""

    @app.before_request
    def auth_context():
        token = get_token_from_request()
        if token:
            try:
                payload = validate_token(token)
                g.user_id = payload.get("user_id")
                g.user_role = payload.get("role", "student")
            except ValueError:
                g.user_id = None
                g.user_role = None
