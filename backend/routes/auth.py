from flask import Blueprint, jsonify, request
import logging

logger = logging.getLogger(__name__)
bp = Blueprint("auth", __name__)


@bp.route("/login", methods=["POST"])
def login():
    """Login endpoint"""
    if not request.is_json:
        return jsonify({"message": "Missing JSON in request"}), 400

    username = request.json.get("username")
    password = request.json.get("password")

    if not username or not password:
        return jsonify({"message": "Missing username or password"}), 400

    # Here should be the logic of checking the username and password from the database or any other source of truth

    return jsonify({"message": "Login successful"}), 200


@bp.route("/status", methods=["GET"])
def auth_status():
    """Auth status check endpoint"""
    return jsonify({"status": "active"}), 200
