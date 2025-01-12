"""Routes package initialization."""

from flask import Blueprint


def init_routes(app):
    """Initialize and register all route blueprints."""
    from .question_bank import question_bank
    from .adaptive_content_routes import adaptive_content_bp
    from .adaptive_learning_routes import adaptive_routes

    # Register blueprints with proper URL prefixes
    app.register_blueprint(question_bank, url_prefix="/api")
    app.register_blueprint(adaptive_content_bp, url_prefix="/api/adaptive")
    app.register_blueprint(adaptive_routes, url_prefix="/api/learning")

    return app


__all__ = ["init_routes"]
