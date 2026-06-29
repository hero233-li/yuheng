对，我看了你这个新前端模块。结论先说清楚：

**它不是直接适配你现在 yuheng 的 `/api/jobs/` 创建方式，而是自己约定了一套业务接口：**

```txt
POST /api/product-data/business-access/search
POST /api/product-data/business-access/{recordId}/invalidate
POST /api/product-data/business-access/{recordId}/notifications/query
POST /api/product-data/business-access/{recordId}/notifications/{notificationId}/push-new
POST /api/product-data/business-access/{recordId}/notifications/{notificationId}/push-old
GET  /api/jobs/{jobId}
```

这个前端模块 README 里也写了默认业务入口是 `/product-data/business-access`，Job 轮询是 `/jobs/{jobId}`。([GitHub][1])
所以你现在 404 的原因是：**前端确实是 workflow 思路，但不是直接调用 yuheng 原来的 `POST /api/jobs/`；它希望后端先提供这些业务入口，由业务入口创建 Job，再返回一个包装后的 job submission。**

---

## 你后端应该怎么改

你需要新增一个业务准入 workflow，名字比如：

```txt
business_access
```

然后新增几个 Django view，专门接这个前端页面的请求。

后端需要做成这个流程：

```txt
前端 POST /api/product-data/business-access/search
        ↓
Django view 创建 Job，payload.workflow = business_access，payload.action = search
        ↓
返回 { ok: true, data: { id, operation, status, stage, progress, traceId } }
        ↓
前端 GET /api/jobs/{id}
        ↓
后端返回 { ok: true, data: { id, workflowId, status, stage, progress, result, errorMessage } }
```

注意：你现有 yuheng 的 `/api/jobs/` 是直接返回 `serialize_job(job)`，不是 `{ok,data}` 包装。`jobs_view` 里创建 Job 后直接 `JsonResponse(serialize_job(job), status=201)`，`job_detail` 也是直接返回 `serialize_job(job)`。([GitHub][2])
但新前端的 `api.ts` 里有 `unwrap()`，它要求后端返回：

```ts
{
  ok: true,
  data: ...
}
```

否则它会认为响应不对。([GitHub][3])

所以**最小改造不是改现有 `/api/jobs/`，而是给这个页面新增兼容接口**。

---

## 一、后端新增 workflow 包

新增目录：

```txt
apps/backend/workflows/business_access/
  __init__.py
  workflow.py
```

`__init__.py`：

```py
from .workflow import run_business_access_workflow

__all__ = ["run_business_access_workflow"]
```

`workflow.py` 先写最小版：

```py
from workflows.common import WorkflowStep, parse_payload, run_steps


def run_business_access_workflow(job):
    workflow = BusinessAccessWorkflow(job)

    return run_steps(
        job=job,
        workflow=workflow,
        start_message="业务准入流程开始",
        result_message="[写入执行结果] 业务准入结果已保存",
        complete_message="业务准入流程完成",
    )


class BusinessAccessWorkflow:
    def __init__(self, job):
        self.job = job
        self.payload = parse_payload(job.payload.get("biz_payload"))
        self.action = self.payload.get("action") or "search"
        self.values = self.payload.get("values") or {}
        self.record_id = self.payload.get("recordId")
        self.notification_id = self.payload.get("notificationId")
        self.version_type = self.payload.get("versionType")
        self.context = {}

    def build_steps(self):
        if self.action == "search":
            return [
                WorkflowStep("读取查询条件", self.load_search_values),
                WorkflowStep("执行业务准入查询", self.search_business_access),
                WorkflowStep("整理查询结果", self.prepare_search_result),
            ]

        if self.action == "invalidate":
            return [
                WorkflowStep("读取业务记录", self.load_record_context),
                WorkflowStep("执行业务失效", self.invalidate_record),
            ]

        if self.action == "notifications":
            return [
                WorkflowStep("读取业务记录", self.load_record_context),
                WorkflowStep("查询通知记录", self.query_notifications),
            ]

        if self.action == "push":
            return [
                WorkflowStep("读取通知记录", self.load_notification_context),
                WorkflowStep("执行通知推送", self.push_notification),
            ]

        raise ValueError(f"不支持的业务准入操作：{self.action}")

    def load_search_values(self):
        name = self.values.get("name") or ""
        certificate_no = self.values.get("certificateNo") or ""

        self.context["name"] = name
        self.context["certificateNo"] = certificate_no

        return f"客户名称：{name}；证件号：{certificate_no}"

    def search_business_access(self):
        # 这里后面替换成真实接口/数据库查询
        name = self.context.get("name") or "测试客户"
        certificate_no = self.context.get("certificateNo") or "000000"

        self.context["records"] = [
            {
                "id": 1,
                "businessNo": "BA-202606-001",
                "customerName": name,
                "certificateNo": certificate_no,
                "productName": "测试产品",
                "organizationName": "测试机构",
                "accessResult": "通过",
                "status": "valid",
                "queriedAt": "2026-06-28 10:00:00",
            }
        ]

        return f"查询到 {len(self.context['records'])} 条业务准入记录"

    def prepare_search_result(self):
        return "查询结果已整理"

    def load_record_context(self):
        return f"业务记录ID：{self.record_id}"

    def invalidate_record(self):
        self.context["invalidated"] = {
            "recordId": self.record_id,
            "message": "业务准入记录已失效",
        }
        return "业务准入记录失效完成"

    def query_notifications(self):
        self.context["notifications"] = [
            {
                "id": 1,
                "notificationNo": "NOTICE-001",
                "notificationType": "准入结果通知",
                "targetSystem": "MPCM",
                "latestVersion": "v2",
                "previousVersion": "v1",
                "updatedAt": "2026-06-28 10:00:00",
            }
        ]
        return "通知记录查询完成"

    def load_notification_context(self):
        return (
            f"业务记录ID：{self.record_id}；"
            f"通知ID：{self.notification_id}；"
            f"版本：{self.version_type}"
        )

    def push_notification(self):
        version = "v2" if self.version_type == "latest" else "v1"
        self.context["pushResult"] = {
            "businessRecordId": self.record_id,
            "notificationId": self.notification_id,
            "versionType": self.version_type,
            "version": version,
            "pushedAt": "2026-06-28 10:00:00",
            "message": "通知推送成功",
        }
        return "通知推送完成"

    def build_result(self):
        if self.action == "search":
            return {
                "records": self.context.get("records") or [],
            }

        if self.action == "invalidate":
            return self.context.get("invalidated") or {}

        if self.action == "notifications":
            return {
                "notifications": self.context.get("notifications") or [],
            }

        if self.action == "push":
            return self.context.get("pushResult") or {}

        return {}
```

---

## 二、registry.py 注册 workflow

你的 `registry.py` 现在只有：

```py
WORKFLOW_RUNNERS = {
    "product_apply": run_product_apply_workflow,
    "search_form_2": run_search_form_2_workflow,
    "reset_password": run_reset_password_workflow,
}
```

需要加：

```py
from workflows.business_access import run_business_access_workflow
```

然后：

```py
WORKFLOW_RUNNERS = {
    "product_apply": run_product_apply_workflow,
    "search_form_2": run_search_form_2_workflow,
    "reset_password": run_reset_password_workflow,
    "business_access": run_business_access_workflow,
}
```

你现在的 worker 会从 `job.payload.get("workflow")` 取 workflow 名，然后从 `WORKFLOW_RUNNERS` 分发。([GitHub][4])

---

## 三、新增 business_access views

新增文件比较干净：

```txt
apps/backend/core/business_access_views.py
```

写：

```py
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from jobs.models import Job, JobLog
from jobs.serializers import serialize_job


def api_ok(data=None, message="ok"):
    return JsonResponse({
        "ok": True,
        "data": data,
        "message": message,
    })


def api_fail(message, status=400):
    return JsonResponse({
        "ok": False,
        "data": None,
        "message": message,
    }, status=status)


def serialize_business_job_submission(job, operation):
    return {
        "id": str(job.id),
        "operation": operation,
        "status": job.status,
        "stage": job.stage,
        "progress": job.progress,
        "traceId": str(job.id).replace("-", ""),
    }


def create_business_access_job(name, action, biz_payload):
    job = Job.objects.create(
        name=name,
        payload={
            "workflow": "business_access",
            "biz_payload": json.dumps({
                "action": action,
                **biz_payload,
            }, ensure_ascii=False),
        },
        stage=Job.STAGE_SUBMITTED,
        progress=5,
        current_step=0,
        total_steps=3,
    )

    JobLog.objects.create(job=job, message="业务准入任务已创建，等待 worker 执行")

    return job


@csrf_exempt
@require_http_methods(["POST"])
def business_access_search(request):
    values = json.loads(request.body or "{}")

    job = create_business_access_job(
        name="业务准入查询",
        action="search",
        biz_payload={
            "values": values,
        },
    )

    return api_ok(
        serialize_business_job_submission(job, "search"),
        "业务准入查询任务已提交",
    )


@csrf_exempt
@require_http_methods(["POST"])
def business_access_invalidate(request, record_id):
    job = create_business_access_job(
        name="业务准入记录失效",
        action="invalidate",
        biz_payload={
            "recordId": int(record_id),
        },
    )

    return api_ok(
        serialize_business_job_submission(job, "invalidate"),
        "业务准入失效任务已提交",
    )


@csrf_exempt
@require_http_methods(["POST"])
def business_access_notifications_query(request, record_id):
    job = create_business_access_job(
        name="业务准入通知查询",
        action="notifications",
        biz_payload={
            "recordId": int(record_id),
        },
    )

    return api_ok(
        serialize_business_job_submission(job, "notifications"),
        "通知查询任务已提交",
    )


@csrf_exempt
@require_http_methods(["POST"])
def business_access_notification_push(request, record_id, notification_id, action):
    version_type = "latest" if action == "push-new" else "previous"

    job = create_business_access_job(
        name="业务准入通知推送",
        action="push",
        biz_payload={
            "recordId": int(record_id),
            "notificationId": int(notification_id),
            "versionType": version_type,
        },
    )

    return api_ok(
        serialize_business_job_submission(job, "push"),
        "通知推送任务已提交",
    )


@require_http_methods(["GET"])
def business_access_job_detail(request, job_id):
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        return api_fail("Job 不存在", status=404)

    serialized = serialize_job(job)

    data = {
        "id": str(job.id),
        "workflowId": job.payload.get("workflow") or "business_access",
        "status": job.status,
        "stage": job.stage,
        "progress": job.progress,
        "result": serialized.get("result") or {},
        "errorMessage": serialized.get("error") or "",
    }

    return api_ok(data, "获取 Job 成功")
```

这里专门新增了 `business_access_job_detail`，因为你的新前端要求 `/jobs/{jobId}` 返回 `{ok,data}` 包装。新模块的 `getJob()` 是 `client.get('/jobs/${id}')`，并且会走 `unwrap()`。([GitHub][3])

---

## 四、urls.py 加路由

在你的主 urls 里加，通常是：

```txt
apps/backend/automation_backend/urls.py
```

引入：

```py
from core import business_access_views
```

加：

```py
path(
    "api/product-data/business-access/search",
    business_access_views.business_access_search,
),
path(
    "api/product-data/business-access/<int:record_id>/invalidate",
    business_access_views.business_access_invalidate,
),
path(
    "api/product-data/business-access/<int:record_id>/notifications/query",
    business_access_views.business_access_notifications_query,
),
path(
    "api/product-data/business-access/<int:record_id>/notifications/<int:notification_id>/<str:action>",
    business_access_views.business_access_notification_push,
),
path(
    "api/jobs/<uuid:job_id>",
    business_access_views.business_access_job_detail,
),
```

注意你前端请求没有尾斜杠，所以后端也先不要尾斜杠。

---

## 五、但是这里有个冲突要注意

你现有 yuheng 本来已经有：

```txt
/api/jobs/<uuid:job_id>/
```

或者类似 job detail 路由。现在新模块请求的是：

```txt
/api/jobs/{jobId}
```

没有尾斜杠，而且要求 `{ok,data}` 包装。
你可以先新增无斜杠版本：

```py
path("api/jobs/<uuid:job_id>", business_access_views.business_access_job_detail),
```

保留原来的有斜杠版本给旧页面用：

```py
path("api/jobs/<uuid:job_id>/", jobs_views.job_detail),
```

这样旧页面不受影响，新页面也能用。

---

## 六、前端是否“适配了 workflow”？

是的，但它的 workflow 是**这种适配方式**：

```txt
业务接口 submitSearch()
  ↓
返回 BusinessAccessJobSubmission
  ↓
pollJob(id)
  ↓
GET /jobs/{id}
  ↓
返回 BusinessAccessJobDetail
```

不是你之前那些页面直接：

```txt
createJob({ workflow, biz_payload })
  ↓
getJob(job.id)
```

新前端的 `api.ts` 明确有 `submitSearch()`、`submitInvalidate()`、`submitNotificationQuery()`、`submitNotificationPush()`，它们都先 POST 到业务入口，再用 `pollJob()` 轮询 `/jobs/{id}`。([GitHub][3])
所以后端要么按我上面说的新增兼容业务接口，要么你就改前端 `api.ts` 让它直接用 yuheng 的 `/api/jobs/`。**最小改动是改后端，给它补这组接口。**

---

## 你现在最小落地顺序

先别一次性把所有真实逻辑塞进去，先跑通：

```txt
1. 新建 business_access workflow
2. registry.py 注册 business_access
3. 新增 business_access_views.py
4. urls.py 加 5 个路径
5. 先返回 mock records
6. 前端确认 search 可以显示结果
7. 再把 search_business_access() 换成你的真实接口
```

这样不会影响你已有的产品申请、卡片搜索、多维表格页面。

[1]: https://github.com/hero233-li/yuheng/tree/main/apps/web/src/pages/business-access-query "yuheng/apps/web/src/pages/business-access-query at main · hero233-li/yuheng · GitHub"
[2]: https://raw.githubusercontent.com/hero233-li/yuheng/main/apps/backend/jobs/views.py "raw.githubusercontent.com"
[3]: https://raw.githubusercontent.com/hero233-li/yuheng/main/apps/web/src/pages/business-access-query/api.ts "raw.githubusercontent.com"
[4]: https://raw.githubusercontent.com/hero233-li/yuheng/main/apps/backend/workflows/registry.py "raw.githubusercontent.com"
