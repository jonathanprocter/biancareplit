from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import Flask


def init_rate_limiter(app: Flask) -> Limiter:
    """Initialize and configure the rate limiter for the Flask application"""
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://",
        strategy="fixed-window",
        headers_enabled=True,
    )

    # Configure route-specific limits
    limiter.limit("100/day")(app.route("/api/flashcards"))
    limiter.limit("50/hour")(app.route("/api/system/status"))

    return limiter
