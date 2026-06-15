import time

from .models import InvocationRecord


class InvocationRecordMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started_at = time.perf_counter()
        response = self.get_response(request)
        duration_ms = int((time.perf_counter() - started_at) * 1000)

        if self._should_record(request.path):
            try:
                InvocationRecord.objects.create(
                    record_type=InvocationRecord.TYPE_API,
                    name=self._format_api_name(request),
                    path=request.path,
                    method=request.method,
                    status_code=response.status_code,
                    success=response.status_code < 400,
                    duration_ms=duration_ms,
                )
            except Exception:
                pass

        return response

    def _should_record(self, path):
        return path.startswith("/api/") and not path.startswith("/api/invocations/")

    def _format_api_name(self, request):
        return f"{request.method} {request.path}"
