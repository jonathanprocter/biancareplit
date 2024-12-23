```python
from flask import Blueprint, jsonify
import logging

logger = logging.getLogger(__name__)
bp = Blueprint("admin", __name__)

@bp.route("/status", methods=["GET"])
def admin_status():
    """Admin status endpoint"""
    try:
        return jsonify({"status": "active", "message": "Admin API is operational"})
    except Exception as e:
        logger.error(f"An error occurred: {e}")
        return jsonify({"status": "error", "message": "An error occurred"})
```