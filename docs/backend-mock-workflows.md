# 后端 Mock 流程维护说明

本文说明当前后端 mock 的组织方式，以及后续替换真实接口时应该改哪里。

## 总体原则

后端 mock 分两类：

| 类型 | 说明 | 主要文件 |
| --- | --- | --- |
| 异步任务流程 | 前端提交任务，`worker` 串行执行步骤，写入 `JobLog`，前端轮询任务状态和日志 | `apps/backend/workflows/*/workflow.py` |
| 普通 mock 接口 | 前端直接请求，后端立即返回数据，用于配置、表格、卡片、导出等 | `apps/backend/core/views.py` |

后续接真实系统时，优先替换底层 `_call_*`、`_query_*`、`_write_*` 方法，不建议直接把真实接口逻辑写在 Django view 里。

## 异步任务入口

入口函数仍在：

```text
apps/backend/workflows/registry.py
```

但 `registry.py` 只做分发，不承载具体业务流程：

```py
WORKFLOW_RUNNERS = {
    "product_apply": run_product_apply_workflow,
    "search_form_2": run_search_form_2_workflow,
    "reset_password": run_reset_password_workflow,
}

def run_workflow(job):
    workflow = job.payload.get("workflow") or "product_apply"
    runner = WORKFLOW_RUNNERS.get(workflow, run_product_apply_workflow)
    return runner(job)
```

具体流程文件：

| workflow | 目录 | 入口文件 |
| --- | --- | --- |
| `product_apply` | `apps/backend/workflows/product_apply/` | `workflow.py` |
| `search_form_2` | `apps/backend/workflows/search_form_2/` | `workflow.py` |
| `reset_password` | `apps/backend/workflows/reset_password/` | `workflow.py` |

通用执行器：

```text
apps/backend/workflows/common.py
```

`common.py` 里放：

| 方法/类 | 说明 |
| --- | --- |
| `WorkflowStep` | 每个 workflow 的步骤定义 |
| `run_steps` | 统一更新 job 阶段、进度、日志 |
| `parse_payload` | 统一解析 `biz_payload` |

前端创建任务时，会通过 `payload.workflow` 指定流程：

| workflow | 页面 | 流程类 |
| --- | --- | --- |
| `product_apply` | 产品申请 | `ProductApplyWorkflow` |
| `search_form_2` | 数据维护 | `SearchForm2Workflow` |
| `reset_password` | 重置密码 | `ResetPasswordWorkflow` |

## 产品申请

流程文件：

```text
apps/backend/workflows/product_apply/workflow.py
```

流程类：`ProductApplyWorkflow`

执行步骤：

| 步骤 | handler | 说明 |
| --- | --- | --- |
| 读取申请参数 | `load_request_context` | 读取环境、产品、所在地、辖行、网点、客户信息 |
| 校验申请字段 | `validate_application_fields` | 校验必输字段、渠道关系、客户身份 |
| 组装交易报文 | `build_trade_message` | 组装上送报文和历史策略 |
| 执行交易预检查 | `precheck_trade` | mock 风险预检查、额度预检查 |
| 提交产品申请 | `submit_application` | mock 提交交易 |
| 确认申请结果 | `confirm_application_result` | mock 查询确认结果 |
| 保存执行结果 | `persist_application_result` | mock 写入归档结果 |

可替换真实接口的位置：

| 方法 | 可替换为 |
| --- | --- |
| `_call_risk_precheck` | 风险预检查接口 |
| `_call_quota_precheck` | 额度预检查接口 |
| `_call_submit_trade` | 产品申请提交接口 |
| `_call_confirm_trade` | 结果确认接口 |
| `_write_result_record` | 结果归档/本地落库 |

## 数据维护

流程文件：

```text
apps/backend/workflows/search_form_2/workflow.py
```

流程类：`SearchForm2Workflow`

执行步骤：

| 步骤 | handler | 说明 |
| --- | --- | --- |
| 读取数据维护参数 | `load_request_context` | 读取环境、操作、附带字段 |
| 校验操作支持关系 | `validate_operation_relation` | 判断当前环境是否支持当前操作 |
| 执行操作前置检查 | `precheck_operation` | mock 权限和前置检查 |
| 生成结果数据 | `generate_result_rows` | 生成结果明细 |
| 准备导出数据 | `prepare_export_data` | 生成导出编号 |

可替换真实接口的位置：

| 方法 | 可替换为 |
| --- | --- |
| `_call_operation_relation_check` | 环境/操作关系校验接口 |
| `_call_permission_check` | 权限或前置检查接口 |
| `_build_rows` | 查询或生成真实结果明细 |

导出接口：

```text
GET /api/mock/search-form-2/results/{result_id}/export/
```

导出内容由 `_build_search_form_2_export_lines` 生成。后续如果改为 Excel、文件流或真实文件下载，优先改这个方法。

## 重置密码

流程文件：

```text
apps/backend/workflows/reset_password/workflow.py
```

流程类：`ResetPasswordWorkflow`

执行步骤：

| 步骤 | handler | 说明 |
| --- | --- | --- |
| 读取重置密码参数 | `load_request_context` | 读取环境和用户名 |
| 校验用户信息 | `validate_user_info` | mock 查询用户编号 |
| 执行密码重置 | `reset_password` | mock 调用重置接口 |
| 写入处理结果 | `persist_reset_result` | mock 写入审计结果 |

可替换真实接口的位置：

| 方法 | 可替换为 |
| --- | --- |
| `_query_user_id` | 用户查询接口 |
| `_call_reset_password` | 密码重置接口 |
| `_write_audit_log` | 审计日志写入 |

## 多维任务表格

接口位置：

```text
apps/backend/core/views.py
```

主要接口：

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/mock/multi-task-table/` | `multi_task_table_mock` | 查询主任务表格 |
| `/api/mock/multi-task-table/rows/` | `multi_task_table_add_row` | 新增主任务 |
| `/api/mock/multi-task-table/rows/{row_id}/` | `multi_task_table_row` | 修改/删除主任务 |
| `/api/mock/multi-task-table/rows/{row_id}/subtasks/` | `multi_task_subtasks` | 查询/新增子任务 |
| `/api/mock/multi-task-table/rows/{row_id}/subtasks/{subtask_id}/` | `multi_task_subtask_detail` | 修改/删除子任务 |

已拆分的细化方法：

| 方法 | 说明 |
| --- | --- |
| `_multi_task_payload` | 统一组装返回结构 |
| `_ensure_multi_task_seed` | 首次启动写入默认数据 |
| `_serialize_multi_task_row` | 主任务序列化 |
| `_serialize_multi_task_subtask` | 子任务序列化 |
| `_next_main_task_id` | 生成主任务编号 |
| `_next_subtask_id` | 生成子任务编号 |
| `_subtask_payload` | 统一组装子任务返回结构 |

多维任务表格现在是本地 SQLite 持久化，不是纯内存 mock，重启项目后数据仍保留。

## 卡片任务

接口位置：

```text
apps/backend/core/views.py
```

主要接口：

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/mock/grouped-cards/` | `grouped_cards_mock` | 按条件查询卡片 |
| `/api/mock/grouped-task/state/` | `grouped_task_state` | 查询任务领取状态 |
| `/api/mock/grouped-task/claim/` | `grouped_task_claim` | 领取任务 |
| `/api/mock/grouped-task/return/` | `grouped_task_return` | 退回领取 |

已拆分的细化方法：

| 方法 | 说明 |
| --- | --- |
| `_filter_grouped_cards` | 按请求参数筛选卡片 |
| `_matches_grouped_card_category` | 类目匹配 |
| `_matches_grouped_card_keyword` | 关键字匹配 |
| `_set_grouped_task_state` | 统一切换领取状态 |

当前卡片任务状态是内存 mock，重启后恢复默认值。如果需要持久化，可以新增模型保存领取状态。

## 日志中心

日志中心不是业务 mock，但会记录所有后端业务接口调用。

写入位置：

```text
apps/backend/core/middleware.py
```

中间件会记录：

| 内容 | 字段 |
| --- | --- |
| 请求参数 | `detail.request_params` |
| 响应参数 | `detail.response_params` |
| 响应日志 | `detail.response_log` |

日志中心查询接口 `/api/invocations/` 自身会被排除，避免刷新日志中心时不断记录自己。

## 新增一个异步 mock 流程

推荐步骤：

1. 在 `apps/backend/workflows/` 下新增一个目录，例如 `flow_a/`。
2. 新增 `apps/backend/workflows/flow_a/__init__.py`，导出 `run_flow_a_workflow`。
3. 新增 `apps/backend/workflows/flow_a/workflow.py`，定义 `FlowAWorkflow`。
4. 类里提供 `build_steps`，每个步骤返回一个 `WorkflowStep("步骤名", self.handler)`。
5. 每个 handler 返回一段执行日志文本。
6. 把真实接口替换点放在 `_call_*`、`_query_*`、`_write_*` 方法里。
7. 在 `apps/backend/workflows/registry.py` 的 `WORKFLOW_RUNNERS` 增加分发。
8. 前端创建任务时传入对应 `workflow`。

示例结构：

```py
class XxxWorkflow:
    def __init__(self, job):
        self.job = job
        self.payload = parse_payload(job.payload.get("biz_payload"))
        self.context = {}

    def build_steps(self):
        return [
            WorkflowStep("读取参数", self.load_request_context),
            WorkflowStep("调用接口", self.call_remote_service),
            WorkflowStep("保存结果", self.persist_result),
        ]

    def call_remote_service(self):
        result = self._call_real_service()
        return f"真实接口返回：{result}"

    def _call_real_service(self):
        return "MOCK_OK"
```

对应 registry：

```py
from workflows.flow_a import run_flow_a_workflow

WORKFLOW_RUNNERS = {
    ...
    "flow_a": run_flow_a_workflow,
}
```

## 新增一个普通 mock 接口

推荐步骤：

1. 在 `apps/backend/core/views.py` 写 view 方法。
2. 把筛选、状态流转、返回组装拆成 `_xxx` 小方法。
3. 在 `apps/backend/automation_backend/urls.py` 注册路由。
4. 在 `apps/web/src/api/app.ts` 增加请求方法。
5. 如果接口需要持久化，优先新增 Django model 和 migration，不要长期依赖内存变量。
