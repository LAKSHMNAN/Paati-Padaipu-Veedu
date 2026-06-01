from django.conf import settings
from django.http import HttpResponse
from urllib.parse import urlparse


def is_allowed_origin(origin):
    if not origin:
        return False
    if origin in settings.CORS_ALLOWED_ORIGINS:
        return True

    parsed = urlparse(origin)
    if parsed.scheme not in {"http", "https"}:
        return False

    # Allow local Vite dev servers even when the port auto-increments.
    if parsed.hostname in {"localhost", "127.0.0.1"} and parsed.port in {5173, 5174, 5175, 5176, 5177}:
        return True

    return False


class SimpleCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse(status=200)
        else:
            response = self.get_response(request)

        origin = request.headers.get("Origin")
        if is_allowed_origin(origin):
            response["Access-Control-Allow-Origin"] = origin
            response["Vary"] = "Origin"
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Session-Key"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return response
