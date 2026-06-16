import json
import os
from collections import Counter
from datetime import datetime, timedelta

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from core.models import InvocationRecord, MultiTaskMainTask, MultiTaskSubTask
from jobs.models import Job
from jobs.serializers import serialize_job, serialize_log

CURRENT_VERSION = os.environ.get("APP_VERSION", "0.1.0")


def health(request):
    return JsonResponse({"ok": True, "mode": settings.APP_MODE, "version": CURRENT_VERSION})


def _serialize_invocation(record):
    detail = _format_invocation_detail(record)
    return {
        "id": record.id,
        "record_type": record.record_type,
        "record_type_label": dict(InvocationRecord.TYPE_CHOICES).get(record.record_type, record.record_type),
        "name": _format_invocation_name(record),
        "path": record.path,
        "method": record.method,
        "status_code": record.status_code,
        "success": record.success,
        "duration_ms": record.duration_ms,
        "detail": detail,
        "has_detail": bool(detail),
        "created_at": timezone.localtime(record.created_at).strftime("%Y-%m-%d %H:%M:%S"),
    }


API_DISPLAY_NAME_EXACT = {
    ("GET", "/api/health/"): "系统健康检查",
    ("GET", "/api/mock/search-form-2/config/"): "数据维护配置查询",
    ("GET", "/api/mock/grouped-cards/"): "卡片任务列表查询",
    ("GET", "/api/mock/grouped-task/state/"): "卡片任务状态查询",
    ("POST", "/api/mock/grouped-task/claim/"): "卡片任务领取",
    ("POST", "/api/mock/grouped-task/return/"): "卡片任务退回领取",
    ("GET", "/api/jobs/"): "任务列表查询",
    ("POST", "/api/jobs/"): "任务创建",
}


def _format_invocation_name(record):
    if record.record_type != InvocationRecord.TYPE_API:
        return record.name
    if " - " in record.name:
        return record.name
    business_name = API_DISPLAY_NAME_EXACT.get((record.method, record.path))
    if not business_name and record.method == "GET" and record.path.startswith("/api/mock/search-form-2/results/"):
        business_name = "数据维护结果导出"
    if not business_name and record.path.startswith("/api/jobs/") and record.path.endswith("/logs/") and record.method == "GET":
        business_name = "任务日志查询"
    if not business_name and record.path.startswith("/api/jobs/") and record.path.endswith("/cancel/") and record.method == "POST":
        business_name = "任务取消"
    if not business_name and record.path.startswith("/api/jobs/") and record.method == "GET":
        business_name = "任务详情查询"
    return f"{business_name or '接口调用'} - {record.method} {record.path}"


def _format_invocation_detail(record):
    enriched_detail = _build_job_invocation_detail(record)
    if enriched_detail:
        return enriched_detail
    if record.detail:
        return record.detail
    return _build_invocation_detail_json(
        record,
        response_body="旧记录未保存响应体；新接口调用会由日志中心自动记录返回内容。",
        response_log=f"{record.method or 'UNKNOWN'} {record.path or '-'} 的旧日志未保存明细。",
    )


def _build_job_invocation_detail(record):
    if record.record_type != InvocationRecord.TYPE_API:
        return ""
    if record.path == "/api/jobs/" and record.method == "GET":
        return _build_invocation_detail_json(
            record,
            response_body=[serialize_job(job) for job in Job.objects.all()[:100]],
            response_log=f"任务列表查询完成，共返回 {min(Job.objects.count(), 100)} 条任务",
        )

    if record.path == "/api/jobs/" and record.method == "POST":
        job = _find_job_for_create_invocation(record)
        if not job:
            return record.detail
        return _build_invocation_detail_json(
            record,
            response_body=serialize_job(job),
            response_log={
                "summary": f"任务创建完成，任务 {job.id} 当前状态：{job.get_status_display()}",
                "logs": [serialize_log(log) for log in job.logs.all()],
            },
        )

    job_id = _extract_job_id_from_path(record.path)
    if not job_id:
        return ""

    job = Job.objects.filter(id=job_id).first()
    if not job:
        return record.detail

    if record.path.endswith("/logs/"):
        logs = [serialize_log(log) for log in job.logs.all()]
        return _build_invocation_detail_json(
            record,
            response_body=logs,
            response_log={
                "summary": f"任务日志查询完成，任务 {job_id} 共返回 {len(logs)} 条日志",
                "logs": logs,
            },
        )

    return _build_invocation_detail_json(
        record,
        response_body=serialize_job(job),
        response_log={
            "summary": f"任务详情查询完成，任务 {job_id} 当前状态：{job.get_status_display()}",
            "logs": [serialize_log(log) for log in job.logs.all()],
        },
    )


def _find_job_for_create_invocation(record):
    job_id = _extract_job_id_from_detail(record.detail)
    if job_id:
        job = Job.objects.filter(id=job_id).first()
        if job:
            return job
    start_time = record.created_at - timedelta(seconds=3)
    end_time = record.created_at + timedelta(seconds=10)
    return Job.objects.filter(created_at__gte=start_time, created_at__lte=end_time).order_by("created_at").first()


def _extract_job_id_from_detail(detail):
    if not detail:
        return ""
    try:
        parsed = json.loads(detail)
        body = parsed.get("response_params", {}).get("body")
        if isinstance(body, str):
            body = json.loads(body)
        if isinstance(body, dict):
            return body.get("id") or ""
    except Exception:
        return ""
    return ""


def _extract_job_id_from_path(path):
    parts = path.strip("/").split("/")
    if len(parts) < 3 or parts[0] != "api" or parts[1] != "jobs":
        return ""
    return parts[2]


def _build_invocation_detail_json(record, response_body, response_log):
    return json.dumps(
        {
            "request_params": {
                "method": record.method,
                "path": record.path,
                "query": "历史记录补全",
                "body": "无",
            },
            "response_params": {
                "status_code": record.status_code,
                "success": record.success,
                "body": response_body,
            },
            "response_log": response_log,
        },
        ensure_ascii=False,
    )


def _date_key(created_at):
    return timezone.localtime(created_at).strftime("%Y-%m-%d")


def _period_start(period):
    now = timezone.now()
    if period == "day":
        return now - timedelta(days=1)
    if period == "week":
        return now - timedelta(days=7)
    if period == "month":
        return now - timedelta(days=30)
    if period == "year":
        return now - timedelta(days=365)
    return now - timedelta(days=7)


def _period_axis_stats(records, daily_counter, period):
    today = timezone.localdate()
    if period == "day":
        days = 14
        return [
            {
                "date": (today - timedelta(days=offset)).strftime("%Y-%m-%d"),
                "count": daily_counter[(today - timedelta(days=offset)).strftime("%Y-%m-%d")],
            }
            for offset in range(days - 1, -1, -1)
        ]
    if period == "week":
        week_counter = Counter(_week_key(timezone.localtime(record.created_at).date()) for record in records)
        return [
            {
                "date": _week_key(today - timedelta(weeks=offset)),
                "count": week_counter[_week_key(today - timedelta(weeks=offset))],
            }
            for offset in range(11, -1, -1)
        ]
    if period == "year":
        year_counter = Counter(str(timezone.localtime(record.created_at).year) for record in records)
        return [
            {
                "date": str(today.year - offset),
                "count": year_counter[str(today.year - offset)],
            }
            for offset in range(4, -1, -1)
        ]

    month_counter = Counter(timezone.localtime(record.created_at).strftime("%Y-%m") for record in records)
    return [
        {
            "date": _month_offset(today, offset).strftime("%Y-%m"),
            "count": month_counter[_month_offset(today, offset).strftime("%Y-%m")],
        }
        for offset in range(11, -1, -1)
    ]


def _week_key(current_date):
    year, week, _ = current_date.isocalendar()
    return f"{year}-W{week:02d}"


def _month_offset(current_date, offset):
    month_index = current_date.month - offset
    year = current_date.year
    while month_index <= 0:
        month_index += 12
        year -= 1
    return current_date.replace(year=year, month=month_index, day=1)


def _legacy_daily_stats_for_period(daily_counter, period):
    today = timezone.localdate()
    if period == "day":
        days = 14
        return [
            {
                "date": (today - timedelta(days=offset)).strftime("%Y-%m-%d"),
                "count": daily_counter[(today - timedelta(days=offset)).strftime("%Y-%m-%d")],
            }
            for offset in range(days - 1, -1, -1)
        ]

    days = 7 if period == "week" else 30
    return [
        {
            "date": (today - timedelta(days=offset)).strftime("%Y-%m-%d"),
            "count": daily_counter[(today - timedelta(days=offset)).strftime("%Y-%m-%d")],
        }
        for offset in range(days - 1, -1, -1)
    ]


def _visible_invocation_records():
    return [
        record
        for record in InvocationRecord.objects.all()
        if not _is_hidden_invocation_record(record)
    ]


def _merge_polling_invocation_records(records):
    merged = []
    latest_polling_records = {}

    for record in records:
        polling_key = _polling_invocation_key(record)
        if not polling_key:
            merged.append(record)
            continue
        if polling_key not in latest_polling_records:
            latest_polling_records[polling_key] = record

    merged.extend(latest_polling_records.values())
    return sorted(merged, key=lambda item: item.created_at, reverse=True)


def _polling_invocation_key(record):
    if record.record_type != InvocationRecord.TYPE_API or record.method != "GET":
        return ""
    if record.path == "/api/jobs/":
        return f"{record.method}:{record.path}"
    if record.path.startswith("/api/jobs/") and (record.path.endswith("/logs/") or _extract_job_id_from_path(record.path)):
        return f"{record.method}:{record.path}"
    return ""


def _is_hidden_invocation_record(record):
    if record.record_type == InvocationRecord.TYPE_MENU:
        return True
    return record.path.startswith("/api/invocations/")


@csrf_exempt
@require_http_methods(["GET", "POST"])
def invocations_view(request):
    if request.method == "POST":
        payload = json.loads(request.body or "{}")
        record_type = payload.get("record_type") or InvocationRecord.TYPE_MENU
        if record_type not in {InvocationRecord.TYPE_MENU, InvocationRecord.TYPE_API}:
            return JsonResponse({"detail": "record_type 不正确"}, status=400)
        record = InvocationRecord.objects.create(
            record_type=record_type,
            name=str(payload.get("name") or "未知调用")[:120],
            path=str(payload.get("path") or "")[:300],
            method=str(payload.get("method") or "")[:20],
            success=bool(payload.get("success", True)),
            duration_ms=int(payload.get("duration_ms") or 0),
            detail=str(payload.get("detail") or ""),
        )
        return JsonResponse(_serialize_invocation(record))

    records = _visible_invocation_records()[:300]
    return JsonResponse({"records": [_serialize_invocation(record) for record in records]})


def invocations_summary(request):
    records = _visible_invocation_records()
    api_records = [record for record in records if record.record_type == InvocationRecord.TYPE_API]
    menu_records = [record for record in records if record.record_type == InvocationRecord.TYPE_MENU]
    today = timezone.localdate()
    today_records = [record for record in records if timezone.localtime(record.created_at).date() == today]
    success_count = len([record for record in api_records if record.success])
    success_rate = round(success_count / len(api_records) * 100, 2) if api_records else 100
    avg_duration = round(sum(record.duration_ms for record in api_records) / len(api_records), 2) if api_records else 0

    api_counter = Counter(record.path or record.name for record in api_records)
    daily_counter = Counter(_date_key(record.created_at) for record in records)
    period_stats = {
        period: len([record for record in records if record.created_at >= _period_start(period)])
        for period in ["day", "week", "month", "year"]
    }

    return JsonResponse(
        {
            "summary": {
                "total": len(records),
                "today": len(today_records),
                "menu_total": len(menu_records),
                "api_total": len(api_records),
                "api_success_rate": success_rate,
                "avg_duration_ms": avg_duration,
            },
            "period_stats": period_stats,
            "menu_stats": [
                {
                    "name": name,
                    "count": count,
                    "rate": round(count / len(api_records) * 100, 2) if api_records else 0,
                }
                for name, count in api_counter.most_common()
            ],
            "daily_stats": [
                {"date": key, "count": daily_counter[key]}
                for key in sorted(daily_counter.keys())[-14:]
            ],
            "period_daily_stats": {
                period: _period_axis_stats(records, daily_counter, period)
                for period in ["day", "week", "month", "year"]
            },
            "records": [_serialize_invocation(record) for record in records[:300]],
        }
    )


def invocation_detail(request, record_id):
    record = get_object_or_404(InvocationRecord, id=record_id)
    if _is_hidden_invocation_record(record):
        return JsonResponse({"detail": "记录不存在"}, status=404)
    return JsonResponse(_serialize_invocation(record))


GROUPED_CARD_MOCK = [
    {"name": "risk-profile", "english_name": "Risk Profile", "chinese_name": "风险画像", "active": 320, "added": 24, "category": "类目1", "group": "A组", "status": "pending", "description": "A组风险画像任务，等待处理"},
    {"name": "credit-review", "english_name": "Credit Review", "chinese_name": "征信复核", "active": 418, "added": 31, "category": "类目1", "group": "A组", "status": "pending", "description": "A组征信复核任务，等待处理"},
    {"name": "white-list", "english_name": "White List", "chinese_name": "白名单核验", "active": 276, "added": 18, "category": "类目2", "group": "A组", "status": "completed", "description": "A组白名单核验任务，已完成处理"},
    {"name": "company-check", "english_name": "Company Check", "chinese_name": "公司校验", "active": 391, "added": 29, "category": "类目2", "group": "A组", "status": "pending", "description": "A组公司校验任务，等待处理"},
    {"name": "legal-person", "english_name": "Legal Person", "chinese_name": "法人核验", "active": 245, "added": 16, "category": "类目3", "group": "A组", "status": "completed", "description": "A组法人核验任务，已完成处理"},
    {"name": "card-status", "english_name": "Card Status", "chinese_name": "卡状态检查", "active": 363, "added": 21, "category": "类目3", "group": "A组", "status": "pending", "description": "A组卡状态检查任务，等待处理"},
    {"name": "mobile-verify", "english_name": "Mobile Verify", "chinese_name": "手机号核验", "active": 512, "added": 37, "category": "类目4", "group": "A组", "status": "pending", "description": "A组手机号核验任务，等待处理"},
    {"name": "identity-check", "english_name": "Identity Check", "chinese_name": "身份核验", "active": 470, "added": 33, "category": "类目4", "group": "A组", "status": "completed", "description": "A组身份核验任务，已完成处理"},
    {"name": "account-match", "english_name": "Account Match", "chinese_name": "账户匹配", "active": 286, "added": 19, "category": "类目5", "group": "A组", "status": "pending", "description": "A组账户匹配任务，等待处理"},
    {"name": "branch-route", "english_name": "Branch Route", "chinese_name": "辖行路由", "active": 341, "added": 26, "category": "类目5", "group": "A组", "status": "pending", "description": "A组辖行路由任务，等待处理"},
    {"name": "outlet-sync", "english_name": "Outlet Sync", "chinese_name": "网点同步", "active": 299, "added": 22, "category": "类目6", "group": "A组", "status": "completed", "description": "A组网点同步任务，已完成处理"},
    {"name": "red-shield", "english_name": "Red Shield", "chinese_name": "红盾核查", "active": 388, "added": 28, "category": "类目6", "group": "A组", "status": "pending", "description": "A组红盾核查任务，等待处理"},
    {"name": "quota-check", "english_name": "Quota Check", "chinese_name": "额度检查", "active": 455, "added": 35, "category": "类目7", "group": "A组", "status": "pending", "description": "A组额度检查任务，等待处理"},
    {"name": "apply-submit", "english_name": "Apply Submit", "chinese_name": "申请提交", "active": 528, "added": 42, "category": "类目7", "group": "A组", "status": "pending", "description": "A组申请提交任务，等待处理"},
    {"name": "approve-flow", "english_name": "Approve Flow", "chinese_name": "审批流转", "active": 604, "added": 46, "category": "类目8", "group": "A组", "status": "completed", "description": "A组审批流转任务，已完成处理"},
    {"name": "archive-result", "english_name": "Archive Result", "chinese_name": "结果归档", "active": 336, "added": 25, "category": "类目8", "group": "A组", "status": "pending", "description": "A组结果归档任务，等待处理"},
    {"name": "batch-import", "english_name": "Batch Import", "chinese_name": "批量导入", "active": 186, "added": 12, "category": "类目9", "group": "B组", "status": "pending", "description": "B组批量导入任务，等待处理"},
    {"name": "report-export", "english_name": "Report Export", "chinese_name": "报表导出", "active": 211, "added": 15, "category": "类目10", "group": "B组", "status": "completed", "description": "B组报表导出任务，已完成处理"},
    {"name": "notice-send", "english_name": "Notice Send", "chinese_name": "通知发送", "active": 173, "added": 9, "category": "类目11", "group": "B组", "status": "pending", "description": "B组通知发送任务，等待处理"},
    {"name": "data-clean", "english_name": "Data Clean", "chinese_name": "数据清理", "active": 254, "added": 17, "category": "类目12", "group": "B组", "status": "completed", "description": "B组数据清理任务，已完成处理"},
]

GROUPED_TASK_STATE = {
    "task_status": "unclaimed",
    "task_status_label": "未领取",
    "current_node": "节点A-待处理",
}

MULTI_TASK_TABLE_OPTIONS = {
    "product": ["产品A", "产品B", "产品C"],
    "environment": ["环境1", "环境2"],
    "origin": ["产地1", "产地2", "产地3"],
    "region": ["地区1", "地区2", "地区3"],
    "city": ["城市1", "城市2", "城市3"],
    "priority": ["高", "中", "低"],
    "status": ["未提交", "执行中", "已完成", "存档"],
    "taskCategory": ["申请处理", "资料补件", "审批复核", "结果归档"],
}

MULTI_TASK_TABLE_ROWS = [
    {"id": "T-001", "taskName": "产品A申请资料核验主任务", "taskCategory": "申请处理", "product": "产品A", "owner": "张三", "environment": "环境1", "origin": "产地1", "region": "地区1", "city": "城市1", "applyCount": 10, "patchCount": 2, "approveCount": 8, "priority": "高", "status": "执行中", "dueDate": "2026-06-25", "completion": 65, "remark": "A组第一批"},
    {"id": "T-002", "taskName": "产品B补件清单确认主任务", "taskCategory": "资料补件", "product": "产品B", "owner": "李四", "environment": "环境1", "origin": "产地2", "region": "地区3", "city": "城市3", "applyCount": 6, "patchCount": 1, "approveCount": 5, "priority": "中", "status": "未提交", "dueDate": "2026-06-28", "completion": 20, "remark": "待补资料"},
    {"id": "T-003", "taskName": "产品A审批结果归档主任务", "taskCategory": "结果归档", "product": "产品A", "owner": "王五", "environment": "环境2", "origin": "产地1", "region": "地区2", "city": "城市2", "applyCount": 12, "patchCount": 0, "approveCount": 12, "priority": "低", "status": "已完成", "dueDate": "2026-06-18", "completion": 100, "remark": "已完成审批"},
]

MULTI_TASK_SUBTASKS = {
    "T-001": [
        {"id": "ST-001-01", "title": "核验申请材料", "status": "进行中", "remark": "优先处理"},
        {"id": "ST-001-02", "title": "补充审批截图", "status": "未开始", "remark": ""},
    ],
    "T-002": [
        {"id": "ST-002-01", "title": "确认补件清单", "status": "未开始", "remark": "等待资料"},
    ],
    "T-003": [
        {"id": "ST-003-01", "title": "归档审批结果", "status": "已完成", "remark": "已完成"},
    ],
}

SEARCH_FORM_2_CONFIG = {
    "environments": [
        {"label": "环境1", "value": "env_1", "operationIds": ["op_1", "op_2", "op_3"]},
        {"label": "环境2", "value": "env_2", "operationIds": ["op_1", "op_2"]},
        {"label": "环境3", "value": "env_3", "operationIds": ["op_2", "op_3"]},
    ],
    "operations": [
        {
            "label": "操作1",
            "value": "op_1",
            "description": "生成申请校验结果",
            "fields": [
                {"name": "applicantName", "label": "申请人", "type": "input", "required": True, "span": 6, "defaultValue": "张三"},
                {"name": "applyType", "label": "申请类型", "type": "select", "required": True, "span": 6, "defaultValue": "new", "options": [{"label": "新办", "value": "new"}, {"label": "变更", "value": "change"}]},
            ],
        },
        {
            "label": "操作2",
            "value": "op_2",
            "description": "生成资料补件结果",
            "fields": [
                {"name": "certificateNo", "label": "证件号", "type": "input", "required": True, "span": 6, "defaultValue": "ID20260614001"},
                {"name": "priority", "label": "优先级", "type": "select", "required": True, "span": 6, "defaultValue": "normal", "options": [{"label": "普通", "value": "normal"}, {"label": "加急", "value": "urgent"}]},
                {"name": "needSms", "label": "短信通知", "type": "switch", "required": False, "span": 6, "defaultValue": False},
            ],
        },
        {
            "label": "操作3",
            "value": "op_3",
            "description": "生成审批提交结果",
            "fields": [
                {"name": "phone", "label": "手机号", "type": "input", "required": True, "span": 6, "defaultValue": "13800000000"},
                {"name": "channel", "label": "办理渠道", "type": "select", "required": True, "span": 6, "defaultValue": "counter", "options": [{"label": "柜面", "value": "counter"}, {"label": "线上", "value": "online"}]},
                {"name": "autoSubmit", "label": "自动提交", "type": "switch", "required": False, "span": 6, "defaultValue": True},
            ],
        },
    ],
}

def _multi_task_payload():
    _ensure_multi_task_seed()
    status_order = {"未提交": 0, "执行中": 1, "已完成": 2, "存档": 3}
    rows = sorted(
        [_serialize_multi_task_row(row) for row in MultiTaskMainTask.objects.prefetch_related("subtasks").all()],
        key=lambda row: (status_order.get(row["status"], 99), row["id"]),
    )
    return JsonResponse(
        {
            "rows": rows,
            "options": MULTI_TASK_TABLE_OPTIONS,
            "summary": {
                "applyCount": sum(int(row["applyCount"]) for row in rows),
                "patchCount": sum(int(row["patchCount"]) for row in rows),
                "approveCount": sum(int(row["approveCount"]) for row in rows),
                "completed": len([row for row in rows if row["status"] == "已完成"]),
            },
        }
    )


def _ensure_multi_task_seed():
    if MultiTaskMainTask.objects.exists():
        return

    for index, row in enumerate(MULTI_TASK_TABLE_ROWS, start=1):
        main_task = MultiTaskMainTask.objects.create(
            id=row["id"],
            task_name=row["taskName"],
            task_category=row["taskCategory"],
            product=row["product"],
            owner=row["owner"],
            environment=row["environment"],
            origin=row["origin"],
            region=row["region"],
            city=row["city"],
            apply_count=int(row["applyCount"]),
            patch_count=int(row["patchCount"]),
            approve_count=int(row["approveCount"]),
            priority=row["priority"],
            status=row["status"],
            due_date=row["dueDate"],
            completion=int(row["completion"]),
            remark=row["remark"],
            sort_order=index,
        )
        for sub_index, subtask in enumerate(MULTI_TASK_SUBTASKS.get(row["id"], []), start=1):
            MultiTaskSubTask.objects.create(
                id=subtask["id"],
                main_task=main_task,
                title=subtask["title"],
                status=subtask["status"],
                remark=subtask.get("remark", ""),
                sort_order=sub_index,
            )


def _serialize_multi_task_row(row):
    return {
        "id": row.id,
        "taskName": row.task_name,
        "taskCategory": row.task_category,
        "product": row.product,
        "owner": row.owner,
        "environment": row.environment,
        "origin": row.origin,
        "region": row.region,
        "city": row.city,
        "applyCount": row.apply_count,
        "patchCount": row.patch_count,
        "approveCount": row.approve_count,
        "priority": row.priority,
        "status": row.status,
        "dueDate": row.due_date,
        "completion": row.completion,
        "remark": row.remark,
        "subTaskCount": row.subtasks.count(),
    }


def _serialize_multi_task_subtask(subtask):
    return {
        "id": subtask.id,
        "title": subtask.title,
        "status": subtask.status,
        "remark": subtask.remark,
    }


def _next_main_task_id():
    ids = MultiTaskMainTask.objects.values_list("id", flat=True)
    numbers = [int(item.split("-")[-1]) for item in ids if item.startswith("T-") and item.split("-")[-1].isdigit()]
    return f"T-{(max(numbers) if numbers else 0) + 1:03d}"


def _next_subtask_id(row_id):
    ids = MultiTaskSubTask.objects.filter(main_task_id=row_id).values_list("id", flat=True)
    numbers = [int(item.split("-")[-1]) for item in ids if item.split("-")[-1].isdigit()]
    return f"ST-{row_id.split('-')[-1]}-{(max(numbers) if numbers else 0) + 1:02d}"


def multi_task_table_mock(request):
    return _multi_task_payload()


@csrf_exempt
@require_http_methods(["POST"])
def multi_task_table_add_row(request):
    _ensure_multi_task_seed()
    row_id = _next_main_task_id()
    next_index = int(row_id.split("-")[-1])
    MultiTaskMainTask.objects.create(
        id=row_id,
        task_name=f"新建主任务 {next_index}",
        task_category="申请处理",
        product="产品A",
        owner="",
        environment="环境1",
        origin="产地1",
        region="地区1",
        city="城市1",
        apply_count=0,
        patch_count=0,
        approve_count=0,
        priority="中",
        status="未提交",
        due_date=datetime.now().strftime("%Y-%m-%d"),
        completion=0,
        remark="",
        sort_order=MultiTaskMainTask.objects.count() + 1,
    )
    return _multi_task_payload()


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def multi_task_table_row(request, row_id):
    _ensure_multi_task_seed()
    row = MultiTaskMainTask.objects.filter(id=row_id).first()
    if row is None:
        return JsonResponse({"detail": "行数据不存在"}, status=404)

    if request.method == "DELETE":
        row.delete()
        return _multi_task_payload()

    payload = json.loads(request.body or "{}")
    field_map = {
        "product": "product",
        "taskName": "task_name",
        "taskCategory": "task_category",
        "owner": "owner",
        "environment": "environment",
        "origin": "origin",
        "region": "region",
        "city": "city",
        "applyCount": "apply_count",
        "patchCount": "patch_count",
        "approveCount": "approve_count",
        "priority": "priority",
        "status": "status",
        "dueDate": "due_date",
        "completion": "completion",
        "remark": "remark",
    }
    update_fields = []
    for key, model_field in field_map.items():
        if key in payload:
            setattr(row, model_field, payload[key])
            update_fields.append(model_field)
    if update_fields:
        row.save(update_fields=update_fields)
    return _multi_task_payload()


def _subtask_payload(row_id):
    _ensure_multi_task_seed()
    row = MultiTaskMainTask.objects.filter(id=row_id).first()
    if row is None:
        return JsonResponse({"detail": "主任务不存在"}, status=404)
    return JsonResponse(
        {
            "mainTask": _serialize_multi_task_row(row),
            "items": [_serialize_multi_task_subtask(item) for item in row.subtasks.all()],
        }
    )


@csrf_exempt
@require_http_methods(["GET", "POST"])
def multi_task_subtasks(request, row_id):
    if request.method == "GET":
        return _subtask_payload(row_id)

    _ensure_multi_task_seed()
    main_task = MultiTaskMainTask.objects.filter(id=row_id).first()
    if main_task is None:
        return JsonResponse({"detail": "主任务不存在"}, status=404)

    payload = json.loads(request.body or "{}")
    MultiTaskSubTask.objects.create(
        id=_next_subtask_id(row_id),
        main_task=main_task,
        title=payload.get("title") or "新子任务",
        status=payload.get("status") or "未开始",
        remark=payload.get("remark") or "",
        sort_order=main_task.subtasks.count() + 1,
    )
    return _subtask_payload(row_id)


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def multi_task_subtask_detail(request, row_id, subtask_id):
    _ensure_multi_task_seed()
    subtask = MultiTaskSubTask.objects.filter(main_task_id=row_id, id=subtask_id).first()
    if subtask is None:
        return JsonResponse({"detail": "子任务不存在"}, status=404)

    if request.method == "DELETE":
        subtask.delete()
        return _subtask_payload(row_id)

    payload = json.loads(request.body or "{}")
    for key in ["title", "status", "remark"]:
        if key in payload:
            setattr(subtask, key, payload[key])
    subtask.save(update_fields=["title", "status", "remark"])
    return _subtask_payload(row_id)


@csrf_exempt
@require_http_methods(["POST"])
def multi_task_table_save(request):
    payload = json.loads(request.body or "{}")
    rows = payload.get("rows", [])
    if not isinstance(rows, list):
        return JsonResponse({"detail": "rows 必须是数组"}, status=400)

    for index, row in enumerate(rows, start=1):
        if isinstance(row, dict) and row.get("id"):
            main_task, _ = MultiTaskMainTask.objects.get_or_create(
                id=row["id"],
                defaults={
                    "task_name": row.get("taskName") or "新建主任务",
                    "task_category": row.get("taskCategory") or "申请处理",
                    "sort_order": index,
                },
            )
            field_payload = {
                "task_name": row.get("taskName", main_task.task_name or ""),
                "task_category": row.get("taskCategory", main_task.task_category or "申请处理"),
                "product": row.get("product", main_task.product or "产品A"),
                "owner": row.get("owner", ""),
                "environment": row.get("environment", main_task.environment or "环境1"),
                "origin": row.get("origin", main_task.origin or "产地1"),
                "region": row.get("region", main_task.region or "地区1"),
                "city": row.get("city", main_task.city or "城市1"),
                "apply_count": int(row.get("applyCount") or 0),
                "patch_count": int(row.get("patchCount") or 0),
                "approve_count": int(row.get("approveCount") or 0),
                "priority": row.get("priority", main_task.priority or "中"),
                "status": row.get("status", main_task.status or "未提交"),
                "due_date": row.get("dueDate", main_task.due_date or ""),
                "completion": int(row.get("completion") or 0),
                "remark": row.get("remark", ""),
                "sort_order": index,
            }
            for key, value in field_payload.items():
                setattr(main_task, key, value)
            main_task.save()
    return _multi_task_payload()


def search_form_2_config(request):
    return JsonResponse(SEARCH_FORM_2_CONFIG)


def search_form_2_export(request, result_id):
    job = get_object_or_404(Job, id=result_id)
    result = job.result or {}
    if job.status != Job.STATUS_SUCCESS or result.get("workflow") != "search_form_2":
        return JsonResponse({"detail": "任务未完成或没有可导出的数据维护结果"}, status=400)

    content = "\ufeff" + "\n".join(_build_search_form_2_export_lines(result))
    response = HttpResponse(content, content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="search-form-2-{result_id}.csv"'
    return response


def _build_search_form_2_export_lines(result):
    lines = ["结果编号,项目,环境,操作,状态,说明"]
    for row in result.get("rows", []):
        lines.append(
            ",".join(
                [
                    row["id"],
                    row["item"],
                    row["environment"],
                    row["operation"],
                    row["status"],
                    row["message"],
                ]
            )
        )
    return lines


@csrf_exempt
@require_http_methods(["POST"])
def grouped_cards_mock(request):
    payload = json.loads(request.body or "{}")
    cards = _filter_grouped_cards(payload)
    return JsonResponse({"items": cards, "task": GROUPED_TASK_STATE})


def _filter_grouped_cards(payload):
    category = payload.get("category") or "全部"
    keyword = str(payload.get("keyword") or "").strip().lower()
    return [
        card
        for card in GROUPED_CARD_MOCK
        if _matches_grouped_card_category(card, category) and _matches_grouped_card_keyword(card, keyword)
    ]


def _matches_grouped_card_category(card, category):
    return category == "全部" or card["category"] == category


def _matches_grouped_card_keyword(card, keyword):
    if not keyword:
        return True
    return (
        keyword in card["name"].lower()
        or keyword in card["english_name"].lower()
        or keyword in card["chinese_name"].lower()
        or keyword in card["description"].lower()
    )


def grouped_task_state(request):
    return JsonResponse(GROUPED_TASK_STATE)


@csrf_exempt
@require_http_methods(["POST"])
def grouped_task_claim(request):
    _set_grouped_task_state("claimed")
    return JsonResponse(GROUPED_TASK_STATE)


@csrf_exempt
@require_http_methods(["POST"])
def grouped_task_return(request):
    _set_grouped_task_state("unclaimed")
    return JsonResponse(GROUPED_TASK_STATE)


def _set_grouped_task_state(status):
    if status == "claimed":
        GROUPED_TASK_STATE.update(
            {
                "task_status": "claimed",
                "task_status_label": "已领取",
                "current_node": "节点B-处理中",
            }
        )
        return
    GROUPED_TASK_STATE.update(
        {
            "task_status": "unclaimed",
            "task_status_label": "未领取",
            "current_node": "节点A-待处理",
        }
    )
