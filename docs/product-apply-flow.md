# 产品申请链路与维护协议

本文说明“产品申请”页面从前端到后端 worker 的完整链路，以及后续新增字段、新增产品、新增后端状态时应该改哪里。

## 相关文件

| 位置 | 作用 |
| --- | --- |
| `apps/web/src/apps/web/JobCreatePage.tsx` | 产品申请页面，负责渲染表单、提交任务、展示执行结果 |
| `apps/web/src/apps/web/searchFormConfig.ts` | 产品申请表单配置，维护环境、产品、所在地、辖行、网点、字段规则 |
| `apps/web/src/api/app.ts` | 前端 API 封装，包含 `createJob`、`getJob`、`getJobLogs` |
| `apps/backend/jobs/views.py` | job 创建、查询、日志查询接口 |
| `apps/backend/jobs/models.py` | Job、JobLog 数据模型，定义任务状态和阶段 |
| `apps/backend/jobs/serializers.py` | Job 返回给前端的数据结构，包括进度步骤 |
| `apps/backend/jobs/management/commands/runworker.py` | 本地 worker，串行领取并执行任务 |
| `apps/backend/workflows/registry.py` | worker 业务流程分发和产品申请 mock 流程 |

## 整体链路

```text
用户打开产品申请页面
  -> 前端读取 searchFormConfig.ts 生成动态表单
  -> 用户选择环境、产品、所在地、辖行、网点和业务字段
  -> 点击执行
  -> 前端 POST /api/jobs/ 创建 job
  -> Django 写入 Job，返回 job_id
  -> 前端轮询 GET /api/jobs/ 和 GET /api/jobs/{id}/
  -> 本地 worker 从 SQLite 领取 pending job
  -> worker 执行 product_apply workflow
  -> worker 写入 JobLog、progress、stage、result
  -> 前端展示执行结果、执行进度和日志
```

## 前端表单生成

产品申请页面不在页面里硬写字段，而是调用：

```ts
buildSearchConfig(watchedValues)
```

配置文件：

```text
apps/web/src/apps/web/searchFormConfig.ts
```

核心配置：

```ts
const environments = [...]
const productCatalog = [...]
const commonFields = [...]
export const cascadeResetMap = {...}
```

层级关系是：

```text
环境 -> 产品 -> 所在地 -> 辖行 -> 网点
```

这里的“一对多”是配置层面的候选关系，不是页面多选。

例如产品A可以支持环境1、环境2、环境3，但用户一次只选择一个环境。

## 提交协议

点击“执行”时，前端会调用：

```ts
createJob(buildSubmitPayload(values))
```

请求地址：

```text
POST /api/jobs/
```

当前产品申请提交结构：

```json
{
  "name": "产品申请",
  "workflow": "product_apply",
  "search_form": {
    "environment": "env_1",
    "product": "product_a",
    "location": "location_1",
    "jurisdiction": "jurisdiction_1",
    "outlet": "outlet_1",
    "personName": "张三",
    "certificateNo": "110101199001011234",
    "cardNo": "6222000000000000",
    "phone": "13800000000",
    "companyName": "示例公司",
    "creditCode": "91310000MA00000000",
    "whitelist": true,
    "redShield": false,
    "creditReport": false,
    "legalPerson": false
  },
  "biz_payload": "{...}"
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `name` | 任务名称，当前默认是“产品申请” |
| `workflow` | worker 分发用，产品申请固定为 `product_apply` |
| `search_form` | 页面表单提交字段，方便前端详情展示 |
| `biz_payload` | worker 业务执行参数，当前是 JSON 字符串 |

## 后端创建 job

接口文件：

```text
apps/backend/jobs/views.py
```

`POST /api/jobs/` 会创建一条 Job：

```python
job = Job.objects.create(
    name=name,
    payload=payload,
    stage=Job.STAGE_SUBMITTED,
    progress=5,
)
```

同时写一条日志：

```text
任务已创建，等待本机 worker 执行
```

这个接口只负责创建任务，不执行耗时逻辑。

## worker 执行

worker 命令：

```bash
npm run backend:worker
```

实际执行：

```text
apps/backend/jobs/management/commands/runworker.py
```

worker 会循环查找：

```python
Job.objects.filter(status=Job.STATUS_PENDING).order_by("created_at").first()
```

领取后把任务改为：

```text
status = running
stage = executing
progress = 15
```

然后调用：

```python
run_workflow(job)
```

## workflow 分发

文件：

```text
apps/backend/workflows/registry.py
```

当前分发逻辑：

```python
workflow = job.payload.get("workflow") or "product_apply"
if workflow == "search_form_2":
    return run_search_form_2_workflow(job)
return run_product_apply_workflow(job)
```

产品申请执行：

```python
run_product_apply_workflow(job)
```

这个函数负责：

```text
读取任务参数
校验业务参数
调用交易预检查接口
调用交易提交接口
调用结果确认接口
写入本地执行结果
```

当前是 mock，后续真实自动化流程接在这个函数里。

## 状态与进度

Job 状态在：

```text
apps/backend/jobs/models.py
```

任务状态 `status`：

| 值 | 含义 |
| --- | --- |
| `pending` | 等待 worker 执行 |
| `running` | worker 正在执行 |
| `success` | 执行成功 |
| `failed` | 执行失败 |
| `cancelled` | 已取消 |

执行阶段 `stage`：

| 值 | 页面显示 |
| --- | --- |
| `submitted` | 已提交 |
| `executing` | 执行中 |
| `step_1` | 执行第一步 |
| `step_2` | 执行第二步 |
| `completed` | 执行完成 |
| `success` | 执行成功 |
| `failed` | 执行失败 |

前端进度条和步骤条使用后端返回值。

后端返回位置：

```text
apps/backend/jobs/serializers.py
```

关键字段：

```json
{
  "stage": "step_1",
  "stage_label": "执行第一步",
  "stage_steps": [
    { "key": "submitted", "title": "已提交" },
    { "key": "executing", "title": "执行中" }
  ],
  "stage_index": 2,
  "progress": 45
}
```

前端不自己决定步骤名称，只渲染：

```ts
selectedJob.stage_steps.map((step) => ({ title: step.title }))
```

## 前端结果展示

产品申请页面轮询：

```ts
listJobs()
getJob(selectedJobId)
getJobLogs(selectedJobId)
```

展示区域：

| 区域 | 数据来源 |
| --- | --- |
| 执行结果表格 | `GET /api/jobs/` |
| 详情抽屉 | `GET /api/jobs/{id}/` |
| 执行进度 | job 的 `progress`、`stage_steps`、`stage_index` |
| 执行记录 | `GET /api/jobs/{id}/logs/` |
| Mock 返回数据 | job 的 `result` |

## 新增字段

如果新增的是所有产品都有的公共字段，改：

```text
apps/web/src/apps/web/searchFormConfig.ts
```

在 `commonFields` 里追加：

```ts
{
  name: 'email',
  label: '邮箱',
  type: 'input',
  span: 3,
  editable: true,
  visible: true,
  submit: true,
  required: false,
  placeholder: '请输入邮箱',
}
```

如果字段只属于某个产品，放到该产品的 `extraFields`：

```ts
extraFields: [
  {
    name: 'serviceType',
    label: '办理类型',
    type: 'select',
    span: 3,
    editable: true,
    visible: true,
    submit: true,
    required: true,
    defaultValue: 'new',
    options: [
      { label: '新办', value: 'new' },
      { label: '变更', value: 'change' },
    ],
  },
]
```

字段是否提交由 `submit` 控制：

```text
submit: true  提交给后端
submit: false  只在前端显示，不进入 search_form / biz_payload
```

字段宽度由 `span` 控制：

```text
span: 24  一整行
span: 12  半行
span: 8   一行三个
span: 6   一行四个
span: 3   更紧凑
```

## 新增产品

在 `productCatalog` 里新增一个产品：

```ts
{
  id: 'product_c',
  label: '产品C',
  environmentIds: ['env_1', 'env_3'],
  locations: [
    {
      id: 'location_4',
      label: '所在地4',
      jurisdictions: [
        {
          id: 'jurisdiction_5',
          label: '辖行5',
          outlets: [
            { id: 'outlet_6', label: '网点6' },
          ],
        },
      ],
    },
  ],
  fieldOverrides: {
    personName: { required: false },
    certificateNo: { required: true },
    phone: { visible: false, submit: false },
  },
  extraFields: [],
}
```

注意：

```text
environmentIds 控制哪些环境下能选择这个产品。
locations 控制产品支持哪些所在地、辖行、网点。
fieldOverrides 控制公共字段在当前产品下是否必填、是否显示、是否提交。
extraFields 控制当前产品独有字段。
```

## 新增环境、所在地、辖行、网点

新增环境：

```ts
const environments = [
  { label: '环境4', value: 'env_4' },
]
```

然后把产品的 `environmentIds` 加上：

```ts
environmentIds: ['env_1', 'env_4']
```

新增所在地、辖行、网点时，只改产品下的 `locations`：

```ts
locations: [
  {
    id: 'location_5',
    label: '所在地5',
    jurisdictions: [
      {
        id: 'jurisdiction_6',
        label: '辖行6',
        outlets: [
          { id: 'outlet_7', label: '网点7' },
        ],
      },
    ],
  },
]
```

## 新增后端状态

如果只是新增 worker 内部步骤日志，不需要改模型：

```python
JobLog.objects.create(job=job, message="[新步骤] 已完成")
```

如果要新增一个页面步骤，需要改三处。

第一处：`apps/backend/jobs/models.py`

```python
STAGE_REVIEW = "review"
STAGE_CHOICES = [
    ...
    (STAGE_REVIEW, "人工复核"),
]
```

第二处：生成数据库迁移：

```bash
npm run backend:migrate
```

后端固定使用 Python 3.10。Windows 上请用 `py -3.10 -m venv .venv` 创建虚拟环境，macOS/Linux 上请用 `python3.10 -m venv .venv`。

第三处：`apps/backend/jobs/serializers.py`

把新阶段加入 `stage_steps`：

```python
{"key": "review", "title": "人工复核"}
```

worker 执行时设置：

```python
job.stage = "review"
job.progress = 70
job.save(update_fields=["stage", "progress"])
```

前端不需要新增步骤文案，因为前端渲染的是后端返回的 `stage_steps`。

如果前端要给新状态不同颜色，才需要改：

```text
apps/web/src/apps/web/JobCreatePage.tsx
```

在 `stageColor` 里补颜色映射。

## 新增真实业务逻辑

真实产品申请逻辑接在：

```text
apps/backend/workflows/registry.py
```

建议把当前 mock 步骤逐步替换：

```python
steps = [
    ("读取任务参数", "..."),
    ("校验业务参数", "..."),
    ("调用交易预检查接口", "..."),
    ("调用交易提交接口", "..."),
    ("调用结果确认接口", "..."),
]
```

每个真实步骤应该做三件事：

```text
1. 更新 job.stage / job.progress / job.current_step
2. 写 JobLog
3. 出错时抛异常，让 worker 统一标记 failed
```

返回结果写到 `job.result`：

```python
return {
    "ok": True,
    "serial_no": "...",
    "summary": "...",
    "input": parsed_payload,
}
```

## 维护原则

```text
配置和查询接口：前端直连 Django API。
执行类动作：必须创建 Job，由 worker 异步执行。
前端只负责展示状态，不自己决定业务进度。
产品、字段、联动关系优先改 searchFormConfig.ts。
真实自动化流程优先改 workflows/registry.py。
```
