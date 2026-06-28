# 可移植业务准入查询

这个目录是业务准入查询前端的独立副本，可以整体复制到其他 React 项目。目录内包含：

- 查询、结果、通知推送和 Workflow 进度组件；
- Workflow 提交与 Job 轮询 Hook；
- API 封装、TypeScript 类型和样式；
- 默认 Axios 客户端和自定义客户端接入能力。

目录不依赖 Alioth 工程中的其他源码，只依赖以下 npm 包：

```bash
npm install react react-dom antd axios lucide-react
```

## 推荐接入方式

复用目标项目已有的 Axios 实例，这样登录 Token、网关地址和统一错误处理会继续生效：

```tsx
import { BusinessAccessQueryPage } from './business-access-query';
import { apiClient } from './api/client';

export default function Page() {
  return <BusinessAccessQueryPage apiClient={apiClient} />;
}
```

`apiClient` 的 `baseURL` 应指向后端 API 根路径，例如 `/api`。组件默认使用：

- 业务入口：`/product-data/business-access`
- Job 轮询：`/jobs/{jobId}`
- 轮询间隔：500ms

## 零配置接入

如果目标项目同源代理了 `/api`，并将 Token 保存在 `localStorage.alioth_token`，可以直接使用：

```tsx
import { BusinessAccessQueryPage } from './business-access-query';

export default function Page() {
  return <BusinessAccessQueryPage />;
}
```

## 自定义路径和请求配置

```tsx
<BusinessAccessQueryPage
  apiClient={apiClient}
  basePath="/your-gateway/business-access"
  pollIntervalMs={800}
  requestConfig={{
    showGlobalProgress: false,
    useResponseDelay: false,
  }}
/>
```

`showGlobalProgress` 和 `useResponseDelay` 是 Alioth 请求层识别的可选配置；普通 Axios 会忽略它们。

## 只复用逻辑

如果目标项目需要自己的 UI，可以单独使用 API 和 Hook：

```tsx
import {
  createBusinessAccessApi,
  useBusinessAccessWorkflow,
} from './business-access-query';

const api = createBusinessAccessApi({ client: apiClient });

function CustomPage() {
  const state = useBusinessAccessWorkflow(api);
  // 使用 state.search、state.results、state.activity 等自行渲染。
}
```

调用 `createBusinessAccessApi` 时应在组件外创建实例，或者使用 `useMemo`，避免每次渲染重新创建。

## 后端约定

该目录复制的是前端模块，目标系统后端需要提供同样的业务准入 Workflow 接口及通用 Job 查询接口。对应 Alioth 后端实现位于：

- `apps/backend/config/workflows/business_access.yml`
- `apps/backend/src/main/java/com/huagu/alioth/businessaccess/`
- `GET /api/jobs/{jobId}`
