# 前端请求后端说明

## 文件位置

前端请求封装：

```text
apps/web/src/api/client.ts
apps/web/src/api/app.ts
```

后端路由：

```text
apps/backend/automation_backend/urls.py
```

后端接口实现：

```text
apps/backend/core/views.py
apps/backend/jobs/views.py
```

## 请求基础地址

前端环境文件：

```text
apps/web/.env.web
```

当前配置：

```env
APP_MODE=web
VITE_API_BASE_URL=/api
```

开发启动时，Vite 还配置了 `/api` 代理：

```text
apps/web/vite.config.ts
```

页面使用相对路径 `/api/...`，会走 Vite proxy。

内网访问时不要把这里写成 `http://127.0.0.1:8766/api`，否则其他电脑的浏览器会请求它自己的本机。

## Axios 实例

文件：

```text
apps/web/src/api/client.ts
```

当前逻辑：

```ts
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
});
```

响应拦截器会把后端 `detail` 字段转成前端 `Error`：

```ts
const message = error.response?.data?.detail || error.message || '请求失败';
```

后续要加 token、请求日志、统一提示，都在这里做。

## API 方法

文件：

```text
apps/web/src/api/app.ts
```

当前主要方法：

| 方法 | 后端接口 | 说明 |
| --- | --- | --- |
| `createJob` | `POST /api/jobs/` | 创建异步任务 |
| `listJobs` | `GET /api/jobs/` | 查询任务列表 |
| `getJob` | `GET /api/jobs/{id}/` | 查询任务详情 |
| `getJobLogs` | `GET /api/jobs/{id}/logs/` | 查询任务日志 |
| `cancelJob` | `POST /api/jobs/{id}/cancel/` | 取消任务 |
| `getMultiTaskTable` | `GET /api/mock/multi-task-table/` | 多维表格 mock |
| `getSearchForm2Config` | `GET /api/mock/search-form-2/config/` | 数据维护配置 |
| `searchGroupedCards` | `POST /api/mock/grouped-cards/` | 卡片任务搜索 |

重置密码页面不需要新增专用 API，前端直接调用 `createJob` 创建 `reset_password` 异步任务，再轮询 `getJob` 展示进度。

## 页面调用方式

查询接口使用 TanStack Query：

```tsx
const jobsQuery = useQuery({
  queryKey: ['jobs'],
  queryFn: listJobs,
  refetchInterval: 1000,
});
```

提交接口使用 mutation：

```tsx
const createMutation = useMutation({
  mutationFn: createJob,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  },
});
```

点击按钮：

```tsx
createMutation.mutate(payload);
```

## 新增普通接口

示例：新增页面 A 查询接口。

### 1. 后端加 view

```python
def page_a_items(request):
    return JsonResponse({"items": []})
```

### 2. 后端加路由

```python
path("api/page-a/items/", core_views.page_a_items),
```

### 3. 前端加 API 方法

```ts
export async function listPageAItems() {
  const { data } = await apiClient.get('/page-a/items/');
  return data;
}
```

### 4. 页面调用

```tsx
const query = useQuery({
  queryKey: ['page-a-items'],
  queryFn: listPageAItems,
});
```

## 新增耗时接口

耗时业务不要新增一个“直接执行接口”，而是创建 Job。

前端：

```ts
await createJob({
  name: '流程A',
  workflow: 'flow_a',
  biz_payload: JSON.stringify(values),
});
```

后端 worker：

```text
apps/backend/workflows/registry.py
```

增加 `flow_a` 分发和执行函数。

## 错误返回约定

后端推荐错误格式：

```json
{
  "detail": "错误说明"
}
```

前端会自动转成 `Error.message`。

## 调试建议

1. 浏览器 Network 看请求 URL。
2. 确认 Vite proxy 是否启动。
3. 在启动服务的电脑上直接访问 `http://127.0.0.1:8766/api/health/`。
4. 后端报错看启动后端的终端。
5. worker 任务不执行时看 `npm run backend:worker` 输出。
