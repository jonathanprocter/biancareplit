from flask import Blueprint, jsonify
import logging

logger = logging.getLogger(__name__)
bp = Blueprint("api", __name__)


@bp.route("/health", methods=["GET"])
def health_check():
    """Basic health check endpoint"""
    return jsonify({"status": "healthy", "message": "API is operational"})
