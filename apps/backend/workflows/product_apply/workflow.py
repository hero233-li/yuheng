from datetime import datetime

from workflows.common import WorkflowStep, parse_payload, run_steps


def run_product_apply_workflow(job):
    workflow = ProductApplyWorkflow(job)
    return run_steps(
        job=job,
        workflow=workflow,
        start_message="Mock 自动化流程开始",
        result_message="[写入执行结果] 结果已保存到任务记录",
        complete_message="Mock 自动化流程完成",
    )


class ProductApplyWorkflow:
    def __init__(self, job):
        self.job = job
        self.payload = parse_payload(job.payload.get("biz_payload"))
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
