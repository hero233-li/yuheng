# SQLite 数据查看与修改指南

本项目后端使用 Django + SQLite。业务数据、任务记录、任务日志、日志中心记录、多维表格数据都会保存在本机 SQLite 文件里。

## 数据库文件位置

默认数据库文件：

```text
apps/backend/data/web/db.sqlite3
```

如果设置了自定义数据目录：

```powershell
$env:AUTOMATION_DATA_DIR="D:\automation-data"
```

那么数据库会在：

```text
D:\automation-data\web\db.sqlite3
```

macOS/Linux 自定义示例：

```bash
export AUTOMATION_DATA_DIR=/Users/yourname/yuheng-data
```

数据库路径：

```text
/Users/yourname/yuheng-data/web/db.sqlite3
```

## 常用表说明

Django 表名默认是：

```text
应用名_模型名小写
```

当前主要业务表：

| 表名 | Django 模型 | 说明 |
| --- | --- | --- |
| `jobs_job` | `jobs.models.Job` | 异步任务主表 |
| `jobs_joblog` | `jobs.models.JobLog` | 异步任务执行日志 |
| `core_invocationrecord` | `core.models.InvocationRecord` | 日志中心接口调用记录 |
| `core_multitaskmaintask` | `core.models.MultiTaskMainTask` | 多维表格主任务 |
| `core_multitasksubtask` | `core.models.MultiTaskSubTask` | 多维表格子任务 |

系统表：

| 表名 | 说明 |
| --- | --- |
| `django_migrations` | 已执行的数据库迁移 |
| `sqlite_sequence` | 自增 id 计数 |

## 推荐方式：用 Django ORM 查看和修改

推荐优先用 Django ORM 操作数据，因为它会自动处理字段类型、JSON 字段、关联关系和时间字段。

进入 Django shell：

```bash
.venv/bin/python apps/backend/manage.py shell
```

Windows PowerShell：

```powershell
.venv\Scripts\python.exe apps\backend\manage.py shell
```

### 查看任务

```py
from jobs.models import Job, JobLog

Job.objects.count()
Job.objects.all()[:10]
```

查看最近 5 条任务：

```py
for job in Job.objects.all()[:5]:
    print(job.id, job.name, job.status, job.stage, job.progress, job.created_at)
```

查看某个任务：

```py
job = Job.objects.get(id="这里换成任务ID")
print(job.payload)
print(job.result)
print(job.error)
```

查看某个任务日志：

```py
for log in job.logs.all():
    print(log.created_at, log.level, log.message)
```

### 修改任务状态

把某个任务改为失败：

```py
job = Job.objects.get(id="这里换成任务ID")
job.status = Job.STATUS_FAILED
job.stage = Job.STAGE_FAILED
job.progress = 100
job.error = "手动标记失败"
job.save(update_fields=["status", "stage", "progress", "error"])
```

重新把 pending 任务改回待执行：

```py
job = Job.objects.get(id="这里换成任务ID")
job.status = Job.STATUS_PENDING
job.stage = Job.STAGE_SUBMITTED
job.progress = 5
job.current_step = 0
job.error = ""
job.save(update_fields=["status", "stage", "progress", "current_step", "error"])
```

新增一条任务日志：

```py
JobLog.objects.create(job=job, level=JobLog.LEVEL_INFO, message="手动补充一条日志")
```

### 查看日志中心记录

```py
from core.models import InvocationRecord

InvocationRecord.objects.count()
```

查看最近 10 条接口调用：

```py
for record in InvocationRecord.objects.filter(record_type="api")[:10]:
    print(record.id, record.name, record.method, record.path, record.status_code, record.created_at)
```

查看某条接口的请求和响应：

```py
import json

record = InvocationRecord.objects.get(id=1)
detail = json.loads(record.detail)
print(detail["request_params"])
print(detail["response_params"])
print(detail["response_log"])
```

删除日志中心旧记录：

```py
InvocationRecord.objects.filter(record_type="api").delete()
```

只删除 30 天以前的记录：

```py
from django.utils import timezone
from datetime import timedelta

before = timezone.now() - timedelta(days=30)
InvocationRecord.objects.filter(created_at__lt=before).delete()
```

### 查看和修改多维表格

```py
from core.models import MultiTaskMainTask, MultiTaskSubTask
```

查看主任务：

```py
for task in MultiTaskMainTask.objects.all():
    print(task.id, task.task_name, task.task_category, task.status, task.completion)
```

修改主任务状态：

```py
task = MultiTaskMainTask.objects.get(id="T-001")
task.status = "存档"
task.save(update_fields=["status"])
```

修改主任务备注：

```py
task.remark = "这里是新的主任务备注"
task.save(update_fields=["remark"])
```

查看子任务：

```py
for subtask in task.subtasks.all():
    print(subtask.id, subtask.title, subtask.status)
```

新增子任务：

```py
MultiTaskSubTask.objects.create(
    id="ST-001-99",
    main_task=task,
    title="手动新增子任务",
    status="未开始",
    sort_order=99,
)
```

删除子任务：

```py
MultiTaskSubTask.objects.get(id="ST-001-99").delete()
```

## 使用 SQLite 命令行查看

如果你的电脑安装了 `sqlite3` 命令，可以直接查看数据库。

macOS/Linux：

```bash
sqlite3 apps/backend/data/web/db.sqlite3
```

Windows PowerShell：

```powershell
sqlite3 apps\backend\data\web\db.sqlite3
```

进入后常用命令：

```sql
.tables
.schema jobs_job
.schema jobs_joblog
.schema core_invocationrecord
.headers on
.mode column
```

查看所有表：

```sql
.tables
```

查看表结构：

```sql
.schema jobs_job
```

查看最近 10 条任务：

```sql
SELECT id, name, status, stage, progress, created_at
FROM jobs_job
ORDER BY created_at DESC
LIMIT 10;
```

查看某个任务日志：

```sql
SELECT created_at, level, message
FROM jobs_joblog
WHERE job_id = '这里换成任务ID'
ORDER BY created_at ASC;
```

查看最近 20 条接口日志：

```sql
SELECT id, name, method, path, status_code, duration_ms, created_at
FROM core_invocationrecord
WHERE record_type = 'api'
ORDER BY created_at DESC
LIMIT 20;
```

查看多维表格主任务：

```sql
SELECT id, task_name, task_category, status, due_date, completion
FROM core_multitaskmaintask
ORDER BY sort_order ASC, created_at ASC;
```

查看某个主任务的子任务：

```sql
SELECT id, title, status
FROM core_multitasksubtask
WHERE main_task_id = 'T-001'
ORDER BY sort_order ASC, created_at ASC;
```

退出：

```sql
.quit
```

## 使用 SQL 修改数据

直接 SQL 修改前建议先停掉后端和 worker，避免页面或 worker 同时写数据库。

修改任务状态：

```sql
UPDATE jobs_job
SET status = 'failed',
    stage = 'failed',
    progress = 100,
    error = '手动 SQL 标记失败'
WHERE id = '这里换成任务ID';
```

修改多维主任务状态：

```sql
UPDATE core_multitaskmaintask
SET status = '存档'
WHERE id = 'T-001';
```

修改多维主任务备注：

```sql
UPDATE core_multitaskmaintask
SET remark = '新的备注内容'
WHERE id = 'T-001';
```

删除日志中心记录：

```sql
DELETE FROM core_invocationrecord
WHERE record_type = 'api';
```

删除某个任务及其日志：

```sql
DELETE FROM jobs_joblog
WHERE job_id = '这里换成任务ID';

DELETE FROM jobs_job
WHERE id = '这里换成任务ID';
```

注意：如果用 Django ORM 删除 `Job`，关联的 `JobLog` 会自动删除；直接 SQL 删除时，建议明确先删子表日志。

## 查看 JSON 字段

`jobs_job.payload`、`jobs_job.result` 是 JSON 字段，在 SQLite 里实际以文本保存。

SQL 查看：

```sql
SELECT id, name, payload, result
FROM jobs_job
ORDER BY created_at DESC
LIMIT 5;
```

如果 SQLite 支持 JSON 函数，可以这样取字段：

```sql
SELECT id, json_extract(payload, '$.workflow') AS workflow
FROM jobs_job
ORDER BY created_at DESC
LIMIT 10;
```

Django ORM 查看更稳定：

```py
job = Job.objects.first()
print(job.payload.get("workflow"))
print(job.result)
```

## 备份数据库

修改数据前建议备份。

macOS/Linux：

```bash
cp apps/backend/data/web/db.sqlite3 apps/backend/data/web/db.sqlite3.bak
```

Windows PowerShell：

```powershell
Copy-Item apps\backend\data\web\db.sqlite3 apps\backend\data\web\db.sqlite3.bak
```

恢复：

```powershell
Copy-Item apps\backend\data\web\db.sqlite3.bak apps\backend\data\web\db.sqlite3 -Force
```

## 什么时候用 ORM，什么时候用 SQL

推荐选择：

| 场景 | 推荐方式 |
| --- | --- |
| 查看少量数据 | Django ORM 或 SQLite GUI |
| 修改业务字段 | Django ORM |
| 批量清理日志 | SQL 或 Django ORM |
| 修改 JSON 字段 | Django ORM |
| 排查表结构 | SQLite `.schema` |
| 新增字段/改表结构 | Django migration |

不要手动 `ALTER TABLE` 改业务表结构。需要新增字段时，应该改 Django model，然后执行：

```bash
.venv/bin/python apps/backend/manage.py makemigrations
.venv/bin/python apps/backend/manage.py migrate
```

Windows：

```powershell
.venv\Scripts\python.exe apps\backend\manage.py makemigrations
.venv\Scripts\python.exe apps\backend\manage.py migrate
```

## 常见问题

### no such table

说明迁移没有执行。

处理：

```bash
npm run backend:migrate
```

### database is locked

通常是后端、worker、SQLite 工具同时写数据库。

处理：

1. 停掉 `npm run dev`。
2. 关闭 SQLite GUI 或命令行。
3. 重新执行操作。

### 改了数据库页面没刷新

前端有查询缓存，刷新浏览器页面即可。多维表格这类页面也可以切换菜单后再进入。
