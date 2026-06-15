import json
import os
from collections import Counter
from datetime import datetime, timedelta

from django.conf import settings
from django.db.models import Avg
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from core.models import InvocationRecord
from jobs.models import Job

CURRENT_VERSION = os.environ.get("APP_VERSION", "0.1.0")


def health(request):
    return JsonResponse({"ok": True, "mode": settings.APP_MODE, "version": CURRENT_VERSION})


def _serialize_invocation(record):
    return {
        "id": record.id,
        "record_type": record.record_type,
        "record_type_label": dict(InvocationRecord.TYPE_CHOICES).get(record.record_type, record.record_type),
        "name": record.name,
        "path": record.path,
        "method": record.method,
        "status_code": record.status_code,
        "success": record.success,
        "duration_ms": record.duration_ms,
        "detail": record.detail,
        "created_at": timezone.localtime(record.created_at).strftime("%Y-%m-%d %H:%M:%S"),
    }


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

    records = InvocationRecord.objects.all()[:100]
    return JsonResponse({"records": [_serialize_invocation(record) for record in records]})


def invocations_summary(request):
    records = list(InvocationRecord.objects.all())
    api_records = [record for record in records if record.record_type == InvocationRecord.TYPE_API]
    menu_records = [record for record in records if record.record_type == InvocationRecord.TYPE_MENU]
    today = timezone.localdate()
    today_records = [record for record in records if timezone.localtime(record.created_at).date() == today]
    success_count = len([record for record in api_records if record.success])
    success_rate = round(success_count / len(api_records) * 100, 2) if api_records else 100
    avg_duration = InvocationRecord.objects.filter(record_type=InvocationRecord.TYPE_API).aggregate(value=Avg("duration_ms"))["value"] or 0

    menu_counter = Counter(record.name for record in menu_records)
    daily_counter = Counter(_date_key(record.created_at) for record in records)
    period_stats = {
        period: InvocationRecord.objects.filter(created_at__gte=_period_start(period)).count()
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
                "avg_duration_ms": round(avg_duration, 2),
            },
            "period_stats": period_stats,
            "menu_stats": [
                {
                    "name": name,
                    "count": count,
                    "rate": round(count / len(menu_records) * 100, 2) if menu_records else 0,
                }
                for name, count in menu_counter.most_common()
            ],
            "daily_stats": [
                {"date": key, "count": daily_counter[key]}
                for key in sorted(daily_counter.keys())[-14:]
            ],
            "records": [_serialize_invocation(record) for record in InvocationRecord.objects.all()[:100]],
        }
    )


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
    "status": ["未提交", "执行中", "已完成"],
}

MULTI_TASK_TABLE_ROWS = [
    {"id": "T-001", "product": "产品A", "owner": "张三", "environment": "环境1", "origin": "产地1", "region": "地区1", "city": "城市1", "applyCount": 10, "patchCount": 2, "approveCount": 8, "priority": "高", "status": "执行中", "remark": "A组第一批"},
    {"id": "T-002", "product": "产品B", "owner": "李四", "environment": "环境1", "origin": "产地2", "region": "地区3", "city": "城市3", "applyCount": 6, "patchCount": 1, "approveCount": 5, "priority": "中", "status": "未提交", "remark": "待补资料"},
    {"id": "T-003", "product": "产品A", "owner": "王五", "environment": "环境2", "origin": "产地1", "region": "地区2", "city": "城市2", "applyCount": 12, "patchCount": 0, "approveCount": 12, "priority": "低", "status": "已完成", "remark": "已完成审批"},
]

MULTI_TASK_SUBTASKS = {
    "T-001": [
        {"id": "ST-001-01", "title": "核验申请材料", "assignee": "张三", "status": "进行中", "workload": 3, "dueDate": "2026-06-18", "remark": "优先处理"},
        {"id": "ST-001-02", "title": "补充审批截图", "assignee": "赵六", "status": "未开始", "workload": 2, "dueDate": "2026-06-19", "remark": ""},
    ],
    "T-002": [
        {"id": "ST-002-01", "title": "确认补件清单", "assignee": "李四", "status": "未开始", "workload": 1, "dueDate": "2026-06-20", "remark": "等待资料"},
    ],
    "T-003": [
        {"id": "ST-003-01", "title": "归档审批结果", "assignee": "王五", "status": "已完成", "workload": 1, "dueDate": "2026-06-16", "remark": "已完成"},
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
    rows = [
        {
            **row,
            "subTaskCount": len(MULTI_TASK_SUBTASKS.get(row["id"], [])),
        }
        for row in MULTI_TASK_TABLE_ROWS
    ]
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


def multi_task_table_mock(request):
    return _multi_task_payload()


@csrf_exempt
@require_http_methods(["POST"])
def multi_task_table_add_row(request):
    next_index = len(MULTI_TASK_TABLE_ROWS) + 1
    MULTI_TASK_TABLE_ROWS.append(
        {
            "id": f"T-{next_index:03d}",
            "product": "产品A",
            "owner": "",
            "environment": "环境1",
            "origin": "产地1",
            "region": "地区1",
            "city": "城市1",
            "applyCount": 0,
            "patchCount": 0,
            "approveCount": 0,
            "priority": "中",
            "status": "未提交",
            "remark": "",
        }
    )
    MULTI_TASK_SUBTASKS.setdefault(f"T-{next_index:03d}", [])
    return _multi_task_payload()


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def multi_task_table_row(request, row_id):
    row_index = next((index for index, row in enumerate(MULTI_TASK_TABLE_ROWS) if row["id"] == row_id), None)
    if row_index is None:
        return JsonResponse({"detail": "行数据不存在"}, status=404)

    if request.method == "DELETE":
        MULTI_TASK_SUBTASKS.pop(row_id, None)
        MULTI_TASK_TABLE_ROWS.pop(row_index)
        return _multi_task_payload()

    payload = json.loads(request.body or "{}")
    allowed_keys = {
        "product",
        "owner",
        "environment",
        "origin",
        "region",
        "city",
        "applyCount",
        "patchCount",
        "approveCount",
        "priority",
        "status",
        "remark",
    }
    for key in allowed_keys:
        if key in payload:
            MULTI_TASK_TABLE_ROWS[row_index][key] = payload[key]
    return _multi_task_payload()


def _subtask_payload(row_id):
    row = next((item for item in MULTI_TASK_TABLE_ROWS if item["id"] == row_id), None)
    if row is None:
        return JsonResponse({"detail": "主任务不存在"}, status=404)
    return JsonResponse({"mainTask": {**row, "subTaskCount": len(MULTI_TASK_SUBTASKS.get(row_id, []))}, "items": MULTI_TASK_SUBTASKS.get(row_id, [])})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def multi_task_subtasks(request, row_id):
    if request.method == "GET":
        return _subtask_payload(row_id)

    if not any(row["id"] == row_id for row in MULTI_TASK_TABLE_ROWS):
        return JsonResponse({"detail": "主任务不存在"}, status=404)

    subtasks = MULTI_TASK_SUBTASKS.setdefault(row_id, [])
    payload = json.loads(request.body or "{}")
    next_index = len(subtasks) + 1
    subtasks.append(
        {
            "id": f"ST-{row_id.split('-')[-1]}-{next_index:02d}",
            "title": payload.get("title") or "新子任务",
            "assignee": payload.get("assignee") or "",
            "status": payload.get("status") or "未开始",
            "workload": int(payload.get("workload") or 1),
            "dueDate": payload.get("dueDate") or datetime.now().strftime("%Y-%m-%d"),
            "remark": payload.get("remark") or "",
        }
    )
    return _subtask_payload(row_id)


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def multi_task_subtask_detail(request, row_id, subtask_id):
    subtasks = MULTI_TASK_SUBTASKS.setdefault(row_id, [])
    subtask_index = next((index for index, item in enumerate(subtasks) if item["id"] == subtask_id), None)
    if subtask_index is None:
        return JsonResponse({"detail": "子任务不存在"}, status=404)

    if request.method == "DELETE":
        subtasks.pop(subtask_index)
        return _subtask_payload(row_id)

    payload = json.loads(request.body or "{}")
    for key in ["title", "assignee", "status", "workload", "dueDate", "remark"]:
        if key in payload:
            subtasks[subtask_index][key] = payload[key]
    return _subtask_payload(row_id)


@csrf_exempt
@require_http_methods(["POST"])
def multi_task_table_save(request):
    payload = json.loads(request.body or "{}")
    rows = payload.get("rows", [])
    if not isinstance(rows, list):
        return JsonResponse({"detail": "rows 必须是数组"}, status=400)

    MULTI_TASK_TABLE_ROWS.clear()
    for row in rows:
        if isinstance(row, dict) and row.get("id"):
            MULTI_TASK_TABLE_ROWS.append(row.copy())
    return _multi_task_payload()


def search_form_2_config(request):
    return JsonResponse(SEARCH_FORM_2_CONFIG)


def search_form_2_export(request, result_id):
    job = get_object_or_404(Job, id=result_id)
    result = job.result or {}
    if job.status != Job.STATUS_SUCCESS or result.get("workflow") != "search_form_2":
        return JsonResponse({"detail": "任务未完成或没有可导出的数据维护结果"}, status=400)

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
    content = "\ufeff" + "\n".join(lines)
    response = HttpResponse(content, content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="search-form-2-{result_id}.csv"'
    return response


@csrf_exempt
@require_http_methods(["POST"])
def grouped_cards_mock(request):
    payload = json.loads(request.body or "{}")
    category = payload.get("category") or "全部"
    keyword = str(payload.get("keyword") or "").strip().lower()
    cards = [
        card
        for card in GROUPED_CARD_MOCK
        if (category == "全部" or card["category"] == category)
        and (
            not keyword
            or keyword in card["name"].lower()
            or keyword in card["english_name"].lower()
            or keyword in card["chinese_name"].lower()
            or keyword in card["description"].lower()
        )
    ]
    return JsonResponse({"items": cards, "task": GROUPED_TASK_STATE})


def grouped_task_state(request):
    return JsonResponse(GROUPED_TASK_STATE)


@csrf_exempt
@require_http_methods(["POST"])
def grouped_task_claim(request):
    GROUPED_TASK_STATE.update(
        {
            "task_status": "claimed",
            "task_status_label": "已领取",
            "current_node": "节点B-处理中",
        }
    )
    return JsonResponse(GROUPED_TASK_STATE)


@csrf_exempt
@require_http_methods(["POST"])
def grouped_task_return(request):
    GROUPED_TASK_STATE.update(
        {
            "task_status": "unclaimed",
            "task_status_label": "未领取",
            "current_node": "节点A-待处理",
        }
    )
    return JsonResponse(GROUPED_TASK_STATE)
