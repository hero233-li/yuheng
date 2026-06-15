import json
import time
from datetime import datetime

from jobs.models import JobLog


def run_workflow(job):
    workflow = job.payload.get("workflow") or "product_apply"
    if workflow == "search_form_2":
        return run_search_form_2_workflow(job)
    return run_product_apply_workflow(job)


def run_product_apply_workflow(job):
    """Mock 业务流程入口。后续把真实交易接口调用接到这里。"""
    raw_payload = job.payload.get("biz_payload")
    parsed_payload = _parse_payload(raw_payload)

    steps = [
        ("读取任务参数", f"参数：{json.dumps(parsed_payload, ensure_ascii=False)}"),
        ("校验业务参数", "参数格式校验通过"),
        ("调用交易预检查接口", "Mock 预检查通过，允许继续执行"),
        ("调用交易提交接口", "Mock 交易提交成功，流水号 MOCK-20260614-0001"),
        ("调用结果确认接口", "Mock 交易状态 confirmed"),
    ]

    JobLog.objects.create(job=job, message="Mock 自动化流程开始")
    job.total_steps = len(steps)
    job.save(update_fields=["total_steps"])

    for index, (step_name, message) in enumerate(steps, start=1):
        if index == 1:
            job.stage = job.STAGE_STEP_1
        elif index == 2:
            job.stage = job.STAGE_STEP_2
        else:
            job.stage = job.STAGE_EXECUTING
        job.current_step = index
        job.progress = min(95, 15 + int(index / len(steps) * 75))
        job.save(update_fields=["stage", "current_step", "progress"])
        JobLog.objects.create(job=job, message=f"[{step_name}] {message}")
        time.sleep(1)

    job.stage = job.STAGE_COMPLETED
    job.progress = 98
    job.save(update_fields=["stage", "progress"])
    JobLog.objects.create(job=job, message="[写入本地执行结果] 结果已保存到任务记录")
    JobLog.objects.create(job=job, message="Mock 自动化流程完成")

    return {
        "ok": True,
        "flow": "mock_trade_flow",
        "serial_no": "MOCK-20260614-0001",
        "summary": "Mock 交易流程已完成，请在 workflows/registry.py 接入真实交易逻辑",
        "input": parsed_payload,
    }


def run_search_form_2_workflow(job):
    parsed_payload = _parse_payload(job.payload.get("biz_payload"))
    environment = parsed_payload.get("environment")
    operation = parsed_payload.get("operation")
    fields = parsed_payload.get("fields") or {}
    environment_label = parsed_payload.get("environmentLabel") or environment
    operation_label = parsed_payload.get("operationLabel") or operation

    steps = [
        ("读取数据维护参数", f"环境：{environment_label}，操作：{operation_label}"),
        ("校验操作支持关系", "Mock 校验通过，当前环境允许执行该操作"),
        ("执行操作前置检查", "Mock 前置检查完成"),
        ("生成结果数据", "Mock 结果明细已生成"),
        ("准备导出数据", "Mock 导出数据已写入任务结果"),
    ]

    JobLog.objects.create(job=job, message="数据维护异步流程开始")
    job.total_steps = len(steps)
    job.save(update_fields=["total_steps"])

    for index, (step_name, message) in enumerate(steps, start=1):
        if index == 1:
            job.stage = job.STAGE_STEP_1
        elif index == 2:
            job.stage = job.STAGE_STEP_2
        else:
            job.stage = job.STAGE_EXECUTING
        job.current_step = index
        job.progress = min(95, 15 + int(index / len(steps) * 75))
        job.save(update_fields=["stage", "current_step", "progress"])
        JobLog.objects.create(job=job, message=f"[{step_name}] {message}")
        time.sleep(1)

    rows = [
        {
            "id": f"R-{index:03d}",
            "item": f"{operation_label}结果{index}",
            "environment": environment_label,
            "operation": operation_label,
            "status": "成功" if index != 2 else "需复核",
            "message": f"worker 已处理字段：{', '.join(fields.keys()) or '无附带字段'}",
        }
        for index in range(1, 4)
    ]

    job.stage = job.STAGE_COMPLETED
    job.progress = 98
    job.save(update_fields=["stage", "progress"])
    JobLog.objects.create(job=job, message="[写入数据维护结果] 结果已保存到任务记录")

    return {
        "ok": True,
        "workflow": "search_form_2",
        "result_id": str(job.id),
        "title": f"{environment_label} - {operation_label}数据维护结果",
        "executed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "summary": {
            "total": len(rows),
            "success": len([row for row in rows if row["status"] == "成功"]),
            "review": len([row for row in rows if row["status"] == "需复核"]),
        },
        "request": {
            "environment": environment,
            "operation": operation,
            "fields": fields,
        },
        "rows": rows,
        "export_url": f"/api/mock/search-form-2/results/{job.id}/export/",
    }


def _parse_payload(raw_payload):
    if not raw_payload:
        return {}
    if isinstance(raw_payload, dict):
        return raw_payload
    if not isinstance(raw_payload, str):
        return {"value": raw_payload}

    try:
        return json.loads(raw_payload)
    except json.JSONDecodeError:
        return {"text": raw_payload}
