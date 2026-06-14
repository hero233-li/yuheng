# 前端请求后端说明

前端请求封装在：

```text
apps/web/src/api/client.ts
apps/web/src/api/branch.ts
```

## 请求基础地址

前端环境变量：

```text
apps/web/.env.branch
```

当前配置：

```env
VITE_API_BASE_URL=http://127.0.0.1:8766/api
```

## Axios 实例

统一请求实例在：

```ts
// apps/web/src/api/client.ts
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
});
```

所有接口都通过这个 `apiClient` 调用。

如果以后要加 token、统一错误提示、请求日志，可以在这里加拦截器。

## 本机接口

本机接口在：

```text
apps/web/src/api/branch.ts
```

当前主要方法：

```ts
login(payload)
createJob(payload)
listJobs()
getJob(jobId)
getJobLogs(jobId)
cancelJob(jobId)
getSettings()
updateSettings(payload)
```

登录接口：

```ts
export async function login(payload: { username: string; password: string }) {
  const { data } = await apiClient.post<LoginResult>('/auth/login/', payload);
  return data;
}
```

默认账号：

```text
用户名：user
密码：fj001
```

密码默认等于当前分机名。

例如提交搜索任务：

```ts
export async function createJob(payload: Record<string, unknown>) {
  const { data } = await apiClient.post<Job>('/jobs/', payload);
  return data;
}
```

实际请求地址是：

```text
POST http://127.0.0.1:8766/api/jobs/
```

因为 `baseURL` 已经包含：

```text
http://127.0.0.1:8766/api
```

## 页面里怎么调用

页面通过 TanStack Query 调用接口。

查询列表：

```ts
const jobsQuery = useQuery({
  queryKey: ['jobs'],
  queryFn: listJobs,
  refetchInterval: 1000,
});
```

提交任务：

```ts
const mutation = useMutation({
  mutationFn: createJob,
  onSuccess: async (job) => {
    await queryClient.invalidateQueries({ queryKey: ['jobs'] });
  },
});
```

点击搜索时：

```ts
mutation.mutate(buildSubmitPayload(values));
```

## 新增一个后端接口

假设后端新增：

```text
POST /api/jobs/{id}/retry/
```

前端在 `apps/web/src/api/branch.ts` 添加：

```ts
export async function retryJob(jobId: string) {
  const { data } = await apiClient.post<Job>(`/jobs/${jobId}/retry/`);
  return data;
}
```

页面中使用：

```ts
const retryMutation = useMutation({
  mutationFn: retryJob,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
});
```

## 后端对应位置

Django 路由在：

```text
apps/backend/automation_backend/urls.py
```

分机任务接口在：

```text
apps/backend/jobs/views.py
```

本机设置在：

```text
apps/backend/core/views.py
```

## 搜索任务请求数据

搜索页面提交的数据由：

```text
apps/web/src/apps/branch/JobCreatePage.tsx
```

里的 `buildSubmitPayload(values)` 生成。

数据结构：

```json
{
  "name": "搜索任务",
  "search_form": {
    "environment": "env_1",
    "product": "product_a",
    "origin": "origin_1",
    "region": "region_1",
    "city": "city_1",
    "personName": "张三",
    "certificateNo": "110101199001011234",
    "phone": "13800000000"
  },
  "biz_payload": "{...}"
}
```

后端会存入 `jobs_job.payload`。

Mock 执行流程读取入口：

```text
apps/backend/workflows/registry.py
```
