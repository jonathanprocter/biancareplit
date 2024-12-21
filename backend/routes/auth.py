from flask import Blueprint, jsonify
import logging

logger = logging.getLogger(__name__)
bp = Blueprint("auth", __name__)


@bp.route("/login", methods=["POST"])
def login():
    """Login endpoint"""
    return jsonify({"message": "Login endpoint"})


@bp.route("/status", methods=["GET"])
def auth_status():
    """Auth status check endpoint"""
    return jsonify({"status": "active"})
