"""Typed domain and HTTP error hierarchy for centralized route error handling."""

from __future__ import annotations


class AppError(Exception):
    """Base structured application error mapped cleanly to HTTP JSON envelopes."""

    def __init__(
        self, message: str, *, code: str = "INTERNAL_ERROR", status_code: int = 500
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class AuthenticationError(AppError):
    """Raised when Firebase ID token is missing, malformed, or expired."""

    def __init__(self, message: str = "Authentication required.") -> None:
        super().__init__(message, code="UNAUTHENTICATED", status_code=401)


class AuthorizationError(AppError):
    """Raised when an authenticated user attempts to access another user's resource."""

    def __init__(
        self, message: str = "You do not have permission to access this resource."
    ) -> None:
        super().__init__(message, code="PERMISSION_DENIED", status_code=403)


class ValidationError(AppError):
    """Raised when input arguments fail domain or schema validation."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="INVALID_ARGUMENT", status_code=400)


class NotFoundError(AppError):
    """Raised when a requested entity or route does not exist."""

    def __init__(self, message: str = "Resource not found.") -> None:
        super().__init__(message, code="NOT_FOUND", status_code=404)


class RateLimitError(AppError):
    """Raised when an upstream or local rate limit is exceeded."""

    def __init__(self, message: str = "Too many requests. Please try again shortly.") -> None:
        super().__init__(message, code="RATE_LIMITED", status_code=429)


class UpstreamProviderError(AppError):
    """Raised when an external API (WAQI, Open-Meteo, Maps, Gemini) fails."""

    def __init__(self, provider: str, message: str) -> None:
        super().__init__(f"{provider}: {message}", code="UPSTREAM_ERROR", status_code=502)
        self.provider = provider
