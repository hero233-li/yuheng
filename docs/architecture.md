# 架构总览

## 当前架构

项目采用前后端分离架构：

```text
浏览器
  -> React/Vite 前端
  -> /api 代理
  -> Django API
  -> SQLite
  -> 本地 worker
```

运行时一共有三个进程：

| 进程 | 启动命令 | 作用 |
| --- | --- | --- |
| React/Vite | `npm run dev:web` | 提供页面和前端资源 |
| Django API | `npm run backend:web` | 提供 `/api/...` 接口 |
| worker | `npm run backend:worker` | 串行执行异步任务 |

`npm run dev` 会同时启动这三个进程。

## 目录边界

```text
apps/web
```

只放前端代码。包括页面、菜单、路由、接口封装、前端状态。

```text
apps/backend
```

只放后端代码。包括 Django settings、urls、models、views、worker、workflow。

```text
scripts
```

只放项目启动脚本。不要把业务逻辑写进这里。

```text
docs
```

维护文档。新增重要模块时需要同步更新文档。

## 请求链路

前端页面访问：

```text
浏览器 -> http://服务电脑IP:5174
```

前端 API 请求：

```text
浏览器 -> /api/jobs/ -> Vite proxy -> Django 8766 -> /api/jobs/
```

Vite 代理配置在：

```text
apps/web/vite.config.ts
```

Django 路由配置在：

```text
apps/backend/automation_backend/urls.py
```

## 任务执行链路

耗时任务不在 API 请求里直接执行。标准链路：

```text
前端点击执行
  -> POST /api/jobs/
  -> Django 创建 Job
  -> API 立即返回 job_id
  -> worker 领取 pending job
  -> worker 写日志、进度、结果
  -> 前端轮询 Job 状态
```

这样做的目的：

```text
1. 页面不会被耗时任务阻塞
2. 任务有日志和进度
3. 失败后能记录错误
4. 后续可以扩展排队、取消、重试
```

## 数据存储

SQLite 默认位置：

```text
apps/backend/data/web/db.sqlite3
```

该路径由 Django settings 决定：

```text
apps/backend/automation_backend/settings.py
```

环境变量：

```text
AUTOMATION_DATA_DIR
```

如果设置了这个变量，数据库会保存到指定目录。

## 配置层级

前端运行配置：

```text
apps/web/.env.web
apps/web/vite.config.ts
```

后端运行配置：

```text
apps/backend/automation_backend/settings.py
scripts/backend-command.mjs
```

产品申请表单配置：

```text
apps/web/src/apps/web/searchFormConfig.ts
```

页面外观和菜单配置：

```text
apps/web/src/stores/appPreferences.ts
apps/web/src/apps/web/SettingsPage.tsx
```

## 命名约定

| 名称 | 说明 |
| --- | --- |
| web | 当前前端运行模式 |
| job | 异步任务记录 |
| workflow | worker 业务流程类型 |

不要再使用桌面壳、安装包或多端管理相关命名作为新模块名称。

## 新增功能的推荐路径

新增普通查询页面：

```text
新增 Django API
新增 apps/web/src/api/app.ts 方法
新增 React 页面
新增菜单和路由
```

新增耗时执行页面：

```text
新增 workflow
前端 POST /api/jobs/
worker 按 workflow 分发
前端轮询 Job 状态
```

新增纯前端配置页面：

```text
新增 React 页面
必要时新增 zustand store
无需新增 worker
```
