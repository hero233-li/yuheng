from datetime import datetime

from workflows.common import WorkflowStep, parse_payload, run_steps


def run_search_form_2_workflow(job):
    workflow = SearchForm2Workflow(job)
    return run_steps(
        job=job,
        workflow=workflow,
        start_message="数据维护异步流程开始",
        result_message="[写入数据维护结果] 结果已保存到任务记录",
    )


class SearchForm2Workflow:
    def __init__(self, job):
        self.job = job
        self.payload = parse_payload(job.payload.get("biz_payload"))
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
