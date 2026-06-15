# 后端维护指南

## 目录结构

```text
apps/backend/
  manage.py
  automation_backend/
    settings.py
    urls.py
  core/
    models.py
    views.py
    migrations/
  jobs/
    models.py
    views.py
    serializers.py
    management/commands/runworker.py
    migrations/
  workflows/
    registry.py
```

## Django 配置

配置文件：

```text
apps/backend/automation_backend/settings.py
```

重点配置：

| 配置 | 说明 |
| --- | --- |
| `APP_MODE` | 当前默认 `web` |
| `DATA_DIR` | SQLite 数据目录 |
| `DATABASES.default.NAME` | SQLite 文件路径 |
| `CORS_ALLOW_ALL_ORIGINS` | 当前内网开发允许跨域 |
| `CSRF_TRUSTED_ORIGINS` | 本地前端地址 |

默认数据库：

```text
apps/backend/data/web/db.sqlite3
```

自定义数据目录：

```powershell
$env:AUTOMATION_DATA_DIR="D:\automation-data"
npm run backend:web
```

## 路由

总路由文件：

```text
apps/backend/automation_backend/urls.py
```

当前主要路由：

| 路由 | 说明 |
| --- | --- |
| `GET /api/health/` | 健康检查 |
| `POST /api/auth/login/` | 登录 |
| `GET/PUT /api/settings/` | 系统设置 |
| `GET/POST /api/jobs/` | 查询/创建任务 |
| `GET /api/jobs/{id}/` | 查询任务详情 |
| `GET /api/jobs/{id}/logs/` | 查询任务日志 |
| `POST /api/jobs/{id}/cancel/` | 取消 pending 任务 |
| `/api/mock/...` | 当前示例页面 mock 接口 |

新增接口时优先在对应 app 的 `views.py` 写方法，再到 `urls.py` 注册。

## 模型

### Setting

位置：

```text
apps/backend/core/models.py
```

用途：

```text
保存本机设置，例如 machine_id、machine_name
```

读写方式：

```python
Setting.get_value("machine_name", "terminal001")
Setting.set_value("machine_name", "terminal001")
```

### LocalAccount

用途：

```text
保存本机登录账号
```

默认账号：

```text
user / terminal001
```

字段：

| 字段 | 说明 |
| --- | --- |
| `username` | 用户名 |
| `password` | 当前是明文 mock 密码 |
| `terminal_name` | 登录终端名 |

后续如果要正式使用，需要改成密码哈希。

### Job

位置：

```text
apps/backend/jobs/models.py
```

用途：

```text
保存异步任务、任务状态、进度、入参、结果、错误
```

核心字段：

| 字段 | 说明 |
| --- | --- |
| `status` | pending/running/success/failed/cancelled |
| `stage` | 前端进度条展示阶段 |
| `progress` | 0-100 进度 |
| `payload` | 前端提交参数 |
| `result` | worker 成功结果 |
| `error` | worker 失败错误 |

### JobLog

用途：

```text
保存任务执行日志
```

worker 每一步都应该写日志，方便页面展示和排错。

## 数据库迁移

修改模型后执行：

```bash
cd apps/backend
python manage.py makemigrations
```

或在项目根目录使用当前虚拟环境手动执行。

应用迁移：

```bash
npm run backend:migrate
```

注意：

```text
1. 不要手动改 SQLite 表结构
2. 新字段必须有 migration
3. 删除字段前先确认旧数据是否需要迁移
```

## 新增普通 API

示例：新增页面 A 列表接口。

1. 在 `apps/backend/core/views.py` 添加：

```python
def page_a_items(request):
    return JsonResponse({"items": []})
```

2. 在 `apps/backend/automation_backend/urls.py` 添加：

```python
path("api/page-a/items/", core_views.page_a_items),
```

3. 前端在 `apps/web/src/api/app.ts` 添加请求方法。

## 新增耗时业务流程

耗时业务不要直接写在普通 API 里，应该走 Job + worker。

1. 前端创建 Job：

```json
{
  "name": "流程A",
  "workflow": "flow_a",
  "biz_payload": "{}"
}
```

2. 在 `apps/backend/workflows/registry.py` 增加分发：

```python
def run_workflow(job):
    workflow = job.payload.get("workflow") or "product_apply"
    if workflow == "flow_a":
        return run_flow_a_workflow(job)
    ...
```

3. 新增执行函数：

```python
def run_flow_a_workflow(job):
    JobLog.objects.create(job=job, message="流程A开始")
    ...
    return {"ok": True}
```

4. worker 会把返回值写入 `job.result`。

## worker

启动：

```bash
npm run backend:worker
```

文件：

```text
apps/backend/jobs/management/commands/runworker.py
```

逻辑：

```text
循环查找 pending job
  -> 标记 running
  -> 调用 run_workflow(job)
  -> 成功写 success/result
  -> 失败写 failed/error
```

当前 worker 是串行执行。后续如果要并发，优先按业务类型拆 worker 或加任务锁，不要直接多进程抢同一张表。

## 日志和排错

查看任务：

```text
GET /api/jobs/
GET /api/jobs/{id}/
GET /api/jobs/{id}/logs/
```

常见问题：

| 问题 | 检查点 |
| --- | --- |
| 页面提交后不执行 | worker 是否启动 |
| no such table | 是否执行 `npm run backend:migrate` |
| 任务一直 pending | worker 日志、数据库锁 |
| 接口 404 | `urls.py` 是否注册 |
| 前端请求失败 | Vite proxy 和 `VITE_API_BASE_URL` |
