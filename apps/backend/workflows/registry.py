import json
import time
from datetime import datetime
from dataclasses import dataclass
from typing import Callable

from jobs.models import JobLog


@dataclass
class WorkflowStep:
    name: str
    handler: Callable[[], str]


def run_workflow(job):
    workflow = job.payload.get("workflow") or "product_apply"
    if workflow == "search_form_2":
        return run_search_form_2_workflow(job)
    if workflow == "reset_password":
        return run_reset_password_workflow(job)
    return run_product_apply_workflow(job)


def run_product_apply_workflow(job):
    """产品申请 mock 流程入口。真实接口后续从 ProductApplyWorkflow 的底层方法替换。"""
    workflow = ProductApplyWorkflow(job)
    steps = workflow.build_steps()

    JobLog.objects.create(job=job, message="Mock 自动化流程开始")
    job.total_steps = len(steps)
    job.save(update_fields=["total_steps"])

    for index, step in enumerate(steps, start=1):
        if index == 1:
            job.stage = job.STAGE_STEP_1
        elif index == 2:
            job.stage = job.STAGE_STEP_2
        else:
            job.stage = job.STAGE_EXECUTING
        job.current_step = index
        job.progress = min(95, 15 + int(index / len(steps) * 75))
        job.save(update_fields=["stage", "current_step", "progress"])
        message = step.handler()
        JobLog.objects.create(job=job, message=f"[{step.name}] {message}")
        time.sleep(1)

    job.stage = job.STAGE_COMPLETED
    job.progress = 98
    job.save(update_fields=["stage", "progress"])
    JobLog.objects.create(job=job, message="[写入执行结果] 结果已保存到任务记录")
    JobLog.objects.create(job=job, message="Mock 自动化流程完成")
    return workflow.build_result()


class ProductApplyWorkflow:
    def __init__(self, job):
        self.job = job
        self.payload = _parse_payload(job.payload.get("biz_payload"))
        self.context = {
            "request_no": "",
            "precheck_no": "",
            "serial_no": "",
            "confirm_status": "",
            "archive_no": "",
        }

    def build_steps(self):
        return [
            WorkflowStep("读取申请参数", self.load_request_context),
            WorkflowStep("校验申请字段", self.validate_application_fields),
            WorkflowStep("组装交易报文", self.build_trade_message),
            WorkflowStep("执行交易预检查", self.precheck_trade),
            WorkflowStep("提交产品申请", self.submit_application),
            WorkflowStep("确认申请结果", self.confirm_application_result),
            WorkflowStep("保存执行结果", self.persist_application_result),
        ]

    def load_request_context(self):
        request_no = self._create_request_no()
        self.context["request_no"] = request_no
        fields = self._extract_core_fields()
        return self._format_execution_text(
            "已读取申请参数",
            f"请求编号：{request_no}",
            f"环境：{fields['environment']}",
            f"产品：{fields['product']}",
            f"客户：{fields['person_name'] or fields['company_name'] or '未填写'}",
        )

    def validate_application_fields(self):
        missing_fields = self._find_missing_required_fields()
        if missing_fields:
            return self._format_execution_text("Mock 校验发现缺失字段", f"缺失字段：{', '.join(missing_fields)}")
        channel_text = self._validate_channel_relation()
        customer_text = self._validate_customer_identity()
        return self._format_execution_text("申请字段校验通过", channel_text, customer_text)

    def build_trade_message(self):
        message = self._compose_trade_message()
        switch_text = self._compose_switch_policy()
        return self._format_execution_text(
            "交易报文组装完成",
            f"报文字段数：{len(message)}",
            switch_text,
        )

    def precheck_trade(self):
        risk_text = self._call_risk_precheck()
        quota_text = self._call_quota_precheck()
        self.context["precheck_no"] = self._create_mock_no("PRE")
        return self._format_execution_text(
            "交易预检查通过",
            f"预检查流水：{self.context['precheck_no']}",
            risk_text,
            quota_text,
        )

    def submit_application(self):
        serial_no = self._call_submit_trade()
        self.context["serial_no"] = serial_no
        return self._format_execution_text("产品申请提交成功", f"交易流水：{serial_no}")

    def confirm_application_result(self):
        status_text = self._call_confirm_trade()
        return self._format_execution_text("申请结果确认完成", status_text)

    def persist_application_result(self):
        archive_no = self._write_result_record()
        self.context["archive_no"] = archive_no
        return self._format_execution_text("执行结果保存完成", f"归档编号：{archive_no}")

    def build_result(self):
        return {
            "ok": True,
            "workflow": "product_apply",
            "flow": "mock_product_apply_flow",
            "request_no": self.context["request_no"],
            "precheck_no": self.context["precheck_no"],
            "serial_no": self.context["serial_no"],
            "confirm_status": self.context["confirm_status"],
            "archive_no": self.context["archive_no"],
            "summary": "产品申请 Mock 流程已完成，底层方法可替换为真实交易接口",
            "input": self.payload,
        }

    def _extract_core_fields(self):
        return {
            "environment": self.payload.get("environmentLabel") or self.payload.get("environment") or "未选择",
            "product": self.payload.get("productLabel") or self.payload.get("product") or "未选择",
            "location": self.payload.get("locationLabel") or self.payload.get("location") or "未选择",
            "jurisdiction": self.payload.get("jurisdictionLabel") or self.payload.get("jurisdiction") or "未选择",
            "outlet": self.payload.get("outletLabel") or self.payload.get("outlet") or "未选择",
            "person_name": self.payload.get("personName") or "",
            "certificate_no": self.payload.get("certificateNo") or "",
            "card_no": self.payload.get("cardNo") or "",
            "phone": self.payload.get("phone") or "",
            "company_name": self.payload.get("companyName") or "",
            "credit_code": self.payload.get("creditCode") or "",
        }

    def _find_missing_required_fields(self):
        fields = self._extract_core_fields()
        required_map = {
            "环境": fields["environment"],
            "产品": fields["product"],
            "所在地": fields["location"],
            "辖行": fields["jurisdiction"],
            "网点": fields["outlet"],
        }
        return [label for label, value in required_map.items() if not value or value == "未选择"]

    def _validate_channel_relation(self):
        fields = self._extract_core_fields()
        return (
            "渠道关系校验通过："
            f"{fields['product']} / {fields['location']} / {fields['jurisdiction']} / {fields['outlet']}"
        )

    def _validate_customer_identity(self):
        fields = self._extract_core_fields()
        if fields["credit_code"]:
            return f"企业身份校验通过：{fields['company_name'] or '未填写公司名'} / {fields['credit_code']}"
        if fields["certificate_no"]:
            return f"个人身份校验通过：{fields['person_name'] or '未填写姓名'} / {fields['certificate_no']}"
        return "身份校验使用 Mock 兜底规则通过"

    def _compose_trade_message(self):
        fields = self._extract_core_fields()
        return {
            "requestNo": self.context["request_no"],
            "environment": fields["environment"],
            "product": fields["product"],
            "location": fields["location"],
            "jurisdiction": fields["jurisdiction"],
            "outlet": fields["outlet"],
            "personName": fields["person_name"],
            "certificateNo": fields["certificate_no"],
            "cardNo": fields["card_no"],
            "phone": fields["phone"],
            "companyName": fields["company_name"],
            "creditCode": fields["credit_code"],
            "historyPolicies": self._compose_history_policies(),
        }

    def _compose_switch_policy(self):
        policies = self._compose_history_policies()
        enabled = [item["label"] for item in policies if item["enabled"]]
        disabled = [item["label"] for item in policies if not item["enabled"]]
        return f"上送策略：{', '.join(enabled) or '无'}；不上送：{', '.join(disabled) or '无'}"

    def _compose_history_policies(self):
        return [
            {"key": "whitelist", "label": "白名单", "enabled": bool(self.payload.get("whitelist"))},
            {"key": "redShield", "label": "红盾", "enabled": bool(self.payload.get("redShield"))},
            {"key": "creditReport", "label": "征信", "enabled": bool(self.payload.get("creditReport"))},
            {"key": "legalPerson", "label": "法人", "enabled": bool(self.payload.get("legalPerson"))},
        ]

    def _call_risk_precheck(self):
        return "风险预检查接口返回：riskLevel=LOW，允许继续"

    def _call_quota_precheck(self):
        return "额度预检查接口返回：quotaStatus=PASS，额度校验通过"

    def _call_submit_trade(self):
        return self._create_mock_no("APP")

    def _call_confirm_trade(self):
        self.context["confirm_status"] = "CONFIRMED"
        return "结果确认接口返回：CONFIRMED"

    def _write_result_record(self):
        return self._create_mock_no("ARC")

    def _create_request_no(self):
        return self._create_mock_no("REQ")

    def _create_mock_no(self, prefix):
        return f"{prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(self.job.id)[:8]}"

    def _format_execution_text(self, title, *details):
        detail_text = "；".join(detail for detail in details if detail)
        return f"{title}：{detail_text}" if detail_text else title


def run_search_form_2_workflow(job):
    workflow = SearchForm2Workflow(job)
    steps = workflow.build_steps()
    JobLog.objects.create(job=job, message="数据维护异步流程开始")
    job.total_steps = len(steps)
    job.save(update_fields=["total_steps"])

    for index, step in enumerate(steps, start=1):
        if index == 1:
            job.stage = job.STAGE_STEP_1
        elif index == 2:
            job.stage = job.STAGE_STEP_2
        else:
            job.stage = job.STAGE_EXECUTING
        job.current_step = index
        job.progress = min(95, 15 + int(index / len(steps) * 75))
        job.save(update_fields=["stage", "current_step", "progress"])
        JobLog.objects.create(job=job, message=f"[{step.name}] {step.handler()}")
        time.sleep(1)

    job.stage = job.STAGE_COMPLETED
    job.progress = 98
    job.save(update_fields=["stage", "progress"])
    JobLog.objects.create(job=job, message="[写入数据维护结果] 结果已保存到任务记录")
    return workflow.build_result()


class SearchForm2Workflow:
    def __init__(self, job):
        self.job = job
        self.payload = _parse_payload(job.payload.get("biz_payload"))
        self.environment = self.payload.get("environment")
        self.operation = self.payload.get("operation")
        self.fields = self.payload.get("fields") or {}
        self.environment_label = self.payload.get("environmentLabel") or self.environment
        self.operation_label = self.payload.get("operationLabel") or self.operation
        self.context = {
            "check_no": "",
            "result_batch_no": "",
            "export_no": "",
        }

    def build_steps(self):
        return [
            WorkflowStep("读取数据维护参数", self.load_request_context),
            WorkflowStep("校验操作支持关系", self.validate_operation_relation),
            WorkflowStep("执行操作前置检查", self.precheck_operation),
            WorkflowStep("生成结果数据", self.generate_result_rows),
            WorkflowStep("准备导出数据", self.prepare_export_data),
        ]

    def load_request_context(self):
        return self._format_execution_text(
            "已读取数据维护参数",
            f"环境：{self.environment_label}",
            f"操作：{self.operation_label}",
            f"附带字段：{', '.join(self.fields.keys()) or '无'}",
        )

    def validate_operation_relation(self):
        allowed_text = self._call_operation_relation_check()
        return self._format_execution_text("操作支持关系校验通过", allowed_text)

    def precheck_operation(self):
        self.context["check_no"] = self._create_mock_no("CHK")
        return self._format_execution_text(
            "操作前置检查完成",
            f"检查流水：{self.context['check_no']}",
            self._call_permission_check(),
        )

    def generate_result_rows(self):
        self.context["result_batch_no"] = self._create_mock_no("BAT")
        return self._format_execution_text(
            "结果明细生成完成",
            f"结果批次：{self.context['result_batch_no']}",
            "Mock 已生成 3 条明细",
        )

    def prepare_export_data(self):
        self.context["export_no"] = self._create_mock_no("EXP")
        return self._format_execution_text("导出数据准备完成", f"导出编号：{self.context['export_no']}")

    def build_result(self):
        rows = self._build_rows()
        return {
            "ok": True,
            "workflow": "search_form_2",
            "result_id": str(self.job.id),
            "title": f"{self.environment_label} - {self.operation_label}数据维护结果",
            "executed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "summary": {
                "total": len(rows),
                "success": len([row for row in rows if row["status"] == "成功"]),
                "review": len([row for row in rows if row["status"] == "需复核"]),
            },
            "request": {
                "environment": self.environment,
                "operation": self.operation,
                "fields": self.fields,
            },
            "check_no": self.context["check_no"],
            "result_batch_no": self.context["result_batch_no"],
            "export_no": self.context["export_no"],
            "rows": rows,
            "export_url": f"/api/mock/search-form-2/results/{self.job.id}/export/",
        }

    def _build_rows(self):
        return [
            {
                "id": f"R-{index:03d}",
                "item": f"{self.operation_label}结果{index}",
                "environment": self.environment_label,
                "operation": self.operation_label,
                "status": "成功" if index != 2 else "需复核",
                "message": f"worker 已处理字段：{', '.join(self.fields.keys()) or '无附带字段'}",
            }
            for index in range(1, 4)
        ]

    def _call_operation_relation_check(self):
        return f"环境 {self.environment_label} 允许执行 {self.operation_label}"

    def _call_permission_check(self):
        return "权限检查接口返回：ALLOW"

    def _create_mock_no(self, prefix):
        return f"{prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(self.job.id)[:8]}"

    def _format_execution_text(self, title, *details):
        detail_text = "；".join(detail for detail in details if detail)
        return f"{title}：{detail_text}" if detail_text else title


def run_reset_password_workflow(job):
    workflow = ResetPasswordWorkflow(job)
    steps = workflow.build_steps()
    JobLog.objects.create(job=job, message="重置密码异步流程开始")
    job.total_steps = len(steps)
    job.save(update_fields=["total_steps"])

    for index, step in enumerate(steps, start=1):
        if index == 1:
            job.stage = job.STAGE_STEP_1
        elif index == 2:
            job.stage = job.STAGE_STEP_2
        else:
            job.stage = job.STAGE_EXECUTING
        job.current_step = index
        job.progress = min(95, 15 + int(index / len(steps) * 75))
        job.save(update_fields=["stage", "current_step", "progress"])
        JobLog.objects.create(job=job, message=f"[{step.name}] {step.handler()}")
        time.sleep(1)

    job.stage = job.STAGE_COMPLETED
    job.progress = 98
    job.save(update_fields=["stage", "progress"])
    JobLog.objects.create(job=job, message="[写入重置密码结果] 结果已保存到任务记录")
    return workflow.build_result()


class ResetPasswordWorkflow:
    def __init__(self, job):
        self.job = job
        self.payload = _parse_payload(job.payload.get("biz_payload"))
        self.environment = self.payload.get("environment")
        self.environment_label = self.payload.get("environmentLabel") or self.environment
        self.username = self.payload.get("username") or ""
        self.context = {
            "user_id": "",
            "reset_no": "",
            "audit_no": "",
        }

    def build_steps(self):
        return [
            WorkflowStep("读取重置密码参数", self.load_request_context),
            WorkflowStep("校验用户信息", self.validate_user_info),
            WorkflowStep("执行密码重置", self.reset_password),
            WorkflowStep("写入处理结果", self.persist_reset_result),
        ]

    def load_request_context(self):
        return self._format_execution_text("已读取重置密码参数", f"环境：{self.environment_label}", f"用户名：{self.username}")

    def validate_user_info(self):
        self.context["user_id"] = self._query_user_id()
        return self._format_execution_text("用户信息校验通过", f"用户编号：{self.context['user_id']}")

    def reset_password(self):
        self.context["reset_no"] = self._call_reset_password()
        return self._format_execution_text("密码重置接口执行完成", f"重置流水：{self.context['reset_no']}")

    def persist_reset_result(self):
        self.context["audit_no"] = self._write_audit_log()
        return self._format_execution_text("处理结果写入完成", f"审计编号：{self.context['audit_no']}")

    def build_result(self):
        return {
            "ok": True,
            "workflow": "reset_password",
            "environment": self.environment,
            "environment_label": self.environment_label,
            "username": self.username,
            "user_id": self.context["user_id"],
            "reset_no": self.context["reset_no"],
            "audit_no": self.context["audit_no"],
            "summary": f"{self.environment_label} 用户 {self.username} 的密码已完成 Mock 重置",
        }

    def _query_user_id(self):
        return f"USR-{self.username or 'UNKNOWN'}"

    def _call_reset_password(self):
        return self._create_mock_no("RST")

    def _write_audit_log(self):
        return self._create_mock_no("AUD")

    def _create_mock_no(self, prefix):
        return f"{prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(self.job.id)[:8]}"

    def _format_execution_text(self, title, *details):
        detail_text = "；".join(detail for detail in details if detail)
        return f"{title}：{detail_text}" if detail_text else title


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
