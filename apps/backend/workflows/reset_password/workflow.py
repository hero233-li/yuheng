from datetime import datetime

from workflows.common import WorkflowStep, parse_payload, run_steps


def run_reset_password_workflow(job):
    workflow = ResetPasswordWorkflow(job)
    return run_steps(
        job=job,
        workflow=workflow,
        start_message="重置密码异步流程开始",
        result_message="[写入重置密码结果] 结果已保存到任务记录",
    )


class ResetPasswordWorkflow:
    def __init__(self, job):
        self.job = job
        self.payload = parse_payload(job.payload.get("biz_payload"))
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
