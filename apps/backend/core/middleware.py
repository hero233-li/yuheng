import json
import time

from .models import InvocationRecord

API_NAME_EXACT = {
    ("GET", "/api/health/"): "系统健康检查",
    ("GET", "/api/mock/search-form-2/config/"): "数据维护配置查询",
    ("GET", "/api/mock/grouped-cards/"): "卡片任务列表查询",
    ("GET", "/api/mock/grouped-task/state/"): "卡片任务状态查询",
    ("POST", "/api/mock/grouped-task/claim/"): "卡片任务领取",
    ("POST", "/api/mock/grouped-task/return/"): "卡片任务退回领取",
    ("GET", "/api/jobs/"): "任务列表查询",
    ("POST", "/api/jobs/"): "任务创建",
}


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
                    detail=self._format_api_detail(request, response, duration_ms),
                )
            except Exception:
                pass

        return response

    def _should_record(self, path):
        return path.startswith("/api/") and not path.startswith("/api/invocations/")

    def _format_api_name(self, request):
        business_name = self._resolve_api_business_name(request.method, request.path)
        return f"{business_name} - {request.method} {request.path}"

    def _resolve_api_business_name(self, method, path):
        exact_name = API_NAME_EXACT.get((method, path))
        if exact_name:
            return exact_name
        if method == "GET" and path.startswith("/api/mock/search-form-2/results/"):
            return "数据维护结果导出"
        if path.startswith("/api/jobs/") and path.endswith("/logs/") and method == "GET":
            return "任务日志查询"
        if path.startswith("/api/jobs/") and path.endswith("/cancel/") and method == "POST":
            return "任务取消"
        if path.startswith("/api/jobs/") and method == "GET":
            return "任务详情查询"
        return "接口调用"

    def _format_api_detail(self, request, response, duration_ms):
        query_string = request.META.get("QUERY_STRING") or "无"
        content_length = request.META.get("CONTENT_LENGTH") or "0"
        detail = {
            "request_params": {
                "method": request.method,
                "path": request.path,
                "query": query_string,
                "body": self._read_request_body(request),
                "content_length": f"{content_length} bytes",
            },
            "response_params": {
                "status_code": response.status_code,
                "success": response.status_code < 400,
                "body": self._read_response_body(response),
            },
            "response_log": (
                f"{request.method} {request.path} -> {response.status_code}，"
                f"耗时 {duration_ms}ms"
            ),
        }
        return json.dumps(detail, ensure_ascii=False)

    def _read_request_body(self, request):
        try:
            raw_body = request.body.decode("utf-8")
        except Exception:
            return "无法读取请求体"
        return self._truncate_text(raw_body or "无")

    def _read_response_body(self, response):
        if getattr(response, "streaming", False):
            return "流式响应，不记录响应体"
        try:
            body = response.content.decode("utf-8")
        except Exception:
            return "无法读取响应体"
        return self._truncate_text(body or "无")

    def _truncate_text(self, text, limit=3000):
        if len(text) <= limit:
            return text
        return f"{text[:limit]}...(已截断，总长度 {len(text)} 字符)"
