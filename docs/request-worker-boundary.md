# 前端请求与 worker 边界

本文说明哪些前端请求应该立即由 Django 返回，哪些请求应该创建异步任务交给 worker 执行。

## 总原则

```text
页面配置、查询、轻量 mock：普通 API
耗时流程、自动化执行、批量处理、需要进度日志的动作：Job + worker
```

前端永远只请求 Django API，不直接调用 worker。

worker 只从 SQLite 任务表领取任务，不对外提供 HTTP 服务。

## 普通 API

普通 API 适合立刻返回结果，页面不会长时间等待。

当前示例：

| 场景 | 接口 | 是否走 worker |
| --- | --- | --- |
| 健康检查 | `GET /api/health/` | 否 |
| 任务列表查询 | `GET /api/jobs/` | 否 |
| 任务详情查询 | `GET /api/jobs/{id}/` | 否 |
| 任务日志查询 | `GET /api/jobs/{id}/logs/` | 否 |
| 数据维护配置 | `GET /api/mock/search-form-2/config/` | 否 |
| 多维任务表格数据 | `GET /api/mock/multi-task-table/` | 否 |
| 多维任务表格保存 | `POST /api/mock/multi-task-table/save/` | 否 |
| 卡片任务搜索 | `POST /api/mock/grouped-cards/` | 否 |
| 卡片任务完成/取消 | `POST /api/mock/grouped-cards/card-action/` | 否 |
| 菜单访问记录 | `POST /api/invocations/` | 否 |
| 历史调用统计 | `GET /api/invocations/summary/` | 否 |

这些接口直接在 Django view 中处理，读写 SQLite 后返回 JSON。

## 异步 Job

异步 Job 适合需要排队、执行进度、执行日志、可取消、可失败重试的流程。

当前示例：

| 场景 | 创建接口 | worker workflow |
| --- | --- | --- |
| 产品申请 | `POST /api/jobs/` | `product_apply` |
| 数据维护执行 | `POST /api/jobs/` | `search_form_2` |
| 重置密码 | `POST /api/jobs/` | `reset_password` |

前端创建任务后不等待业务执行完成，只拿到 `job_id`：

```json
{
  "id": "job-id",
  "status": "pending",
  "stage": "submitted",
  "progress": 5
}
```

之后前端轮询：

```text
GET /api/jobs/{id}/
GET /api/jobs/{id}/logs/
```

worker 执行时持续更新：

```text
status
stage
progress
result
logs
```

## 产品申请链路

```text
React 产品申请页面
  -> POST /api/jobs/
  -> Django 创建 Job
  -> SQLite 写入 pending
  -> worker 领取 pending
  -> workflows/registry.py 分发 product_apply
  -> workflows/product_apply/workflow.py 执行具体步骤
  -> 写入阶段、进度、日志、结果
  -> React 轮询并展示
```

## 如何判断新接口走不走 worker

使用普通 API 的条件：

```text
1. 通常 1 秒内返回
2. 只是查询、配置、保存页面状态
3. 不需要进度条
4. 不需要执行日志
5. 失败后用户重新点一次即可
```

使用 worker 的条件：

```text
1. 可能执行很多秒或很多分钟
2. 要排队，不能多个流程互相抢资源
3. 要展示执行节点和日志
4. 要支持取消、失败、结果留痕
5. 后续可能替换为真实自动化脚本
```

## 新增 worker 流程

1. 前端调用 `createJob`，传入唯一 `workflow`：

```ts
await createJob({
  name: '流程A',
  workflow: 'flow_a',
  search_form: values,
  biz_payload: JSON.stringify(values),
});
```

2. 后端新增流程目录，例如 `apps/backend/workflows/flow_a/workflow.py`，实现 `run_flow_a_workflow`。

3. 在 `apps/backend/workflows/registry.py` 的 `WORKFLOW_RUNNERS` 增加分发：

```python
WORKFLOW_RUNNERS = {
    ...
    "flow_a": run_flow_a_workflow,
}
```

4. worker 函数内更新进度、日志、结果。

5. 前端根据后端返回的 `stage`、`progress`、`logs` 展示。

## 不要做的事

```text
不要让前端直接请求 worker
不要让耗时自动化在普通 API 里同步执行
不要把状态步骤写死在前端
不要让页面自己假装执行成功
```

页面可以决定展示样式，但执行状态、执行节点、日志、结果应以后端返回为准。
