class AppError(Exception):
    """User-facing application error with a stable type and HTTP status."""

    def __init__(self, message: str, error_type: str = "app_error", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.error_type = error_type
        self.status_code = status_code


class TranscriptError(AppError):
    def __init__(self, message: str):
        super().__init__(message, "transcript_error", 400)


class ModelError(AppError):
    def __init__(self, message: str, error_type: str = "model_error", status_code: int = 503):
        super().__init__(message, error_type, status_code)

