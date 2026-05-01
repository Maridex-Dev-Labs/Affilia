from fastapi import HTTPException, status


class AffiliaError(HTTPException):
    """Base HTTP exception for predictable API errors."""


class UpstreamServiceError(Exception):
    """Raised when a required upstream service is unavailable or returns an unusable response."""

    def __init__(self, detail: str = "A required service is temporarily unavailable.", status_code: int = status.HTTP_503_SERVICE_UNAVAILABLE):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


def bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def unauthorized(detail: str = 'Unauthorized') -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def forbidden(detail: str = 'Forbidden') -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def not_found(detail: str = 'Not found') -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
