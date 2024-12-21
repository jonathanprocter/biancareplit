"""Request validation middleware for Flask application."""

from functools import wraps
from typing import Any, Callable, Dict, Optional

from flask import request, jsonify, current_app
from pydantic import BaseModel, ValidationError


class RequestValidationMiddleware:
    """Middleware for validating request data against Pydantic models."""

    def __init__(self):
        self.validation_schemas = {}

    def validate_request(self, schema: BaseModel) -> Callable:
        """Decorator for validating request data against a Pydantic schema."""

        def decorator(f: Callable) -> Callable:
            @wraps(f)
            def decorated_function(*args: Any, **kwargs: Any) -> Any:
                try:
                    # Get request data based on content type
                    if request.is_json:
                        data = request.get_json()
                    elif request.form:
                        data = request.form.to_dict()
                    else:
                        data = request.args.to_dict()

                    # Validate data against schema
                    validated_data = schema(**data)
                    # Add validated data to request context
                    setattr(request, "validated_data", validated_data)
                    return f(*args, **kwargs)

                except ValidationError as e:
                    current_app.logger.warning(f"Request validation failed: {str(e)}")
                    return (
                        jsonify(
                            {
                                "status": "error",
                                "message": "Validation error",
                                "details": e.errors(),
                            }
                        ),
                        400,
                    )
                except Exception as e:
                    current_app.logger.error(
                        f"Unexpected error in request validation: {str(e)}"
                    )
                    return (
                        jsonify(
                            {"status": "error", "message": "Internal server error"}
                        ),
                        500,
                    )

            return decorated_function

        return decorator


request_validator = RequestValidationMiddleware()
validate_request = request_validator.validate_request
from typing import Dict, Any, Optional
from flask import Request, Response, request, jsonify
import json
import logging

logger = logging.getLogger(__name__)


class RequestValidationMiddleware:
    def __init__(self):
        self.max_content_length = 1024 * 1024  # 1MB
        self.required_headers = ["Content-Type"]

    def process_request(self, request: Request) -> Optional[Response]:
        if request.content_length and request.content_length > self.max_content_length:
            return jsonify({"error": "Request too large"}), 413

        if not self._validate_headers(request):
            return jsonify({"error": "Missing required headers"}), 400

        if request.is_json and request.data:
            try:
                json.loads(request.data)
            except json.JSONDecodeError:
                return jsonify({"error": "Invalid JSON"}), 400

        return None

    def _validate_headers(self, request: Request) -> bool:
        return all(header in request.headers for header in self.required_headers)
