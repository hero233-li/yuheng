# 玉衡

本项目是一个前后端分离的自动化系统：

- 前端：React + TypeScript + Vite + Ant Design
- 后端：Python 3.10 + Django + SQLite
- 执行层：Django management command worker
- 访问方式：浏览器访问 React 页面，前端通过代理调用 Django API

当前只保留 React + Django + worker，不包含桌面壳和 exe 打包。

## 运行环境

推荐版本：

```text
Node：22.12.10
Python：3.10.11
```

Python 必须使用 3.10。项目脚本会检查 Python 版本，不符合会直接退出。

## 目录结构

```text
apps/
  backend/                 Django 后端
    automation_backend/    Django settings / urls
    core/                  健康检查、mock 接口
    jobs/                  任务模型、任务接口、worker 命令
    workflows/             worker 业务流程
  web/                     React 前端
    src/api/               前端请求封装
    src/apps/web/          业务页面
    src/components/        应用布局、菜单、页签
    src/stores/            外观、菜单偏好
    src/types/             前端类型

scripts/
  backend-command.mjs      启动 Django / migrate / worker
  dev-network.mjs          一条命令启动前端、后端、worker
  python-command.mjs       Python 3.10 检测和命令解析

docs/                      维护文档
```

## 第一次安装

Windows PowerShell：

```powershell
npm install
py -3.10 -m venv .venv
.venv\Scripts\activate
pip install -r apps/backend/requirements.txt
npm run backend:migrate
```

macOS/Linux：

```bash
npm install
python3.10 -m venv .venv
. .venv/bin/activate
pip install -r apps/backend/requirements.txt
npm run backend:migrate
```

## 启动

一条命令启动前端、后端和 worker：

```bash
npm run dev
```

默认端口：

```text
React/Vite：http://0.0.0.0:5174
Django API：http://0.0.0.0:8766
```

浏览器访问：

```text
http://127.0.0.1:5174
```

内网访问：

```text
http://启动服务电脑的IP:5174
```

前端请求 `/api/...` 会由 Vite 代理到 Django：

```text
浏览器 -> React 5174 -> Vite proxy -> Django 8766
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 同时启动前端、后端、worker |
| `npm run dev:web` | 只启动 React/Vite |
| `npm run backend:web` | 只启动 Django API |
| `npm run backend:worker` | 只启动 worker |
| `npm run backend:migrate` | 执行 Django 数据库迁移 |
| `npm run build` | 构建前端产物 |

前端构建产物：

```text
apps/web/dist/web/
```

SQLite 数据目录：

```text
apps/backend/data/web/db.sqlite3
```

菜单访问、接口调用、任务记录会持久化保存，项目重启后不会清空。

## 文档导航

建议按这个顺序阅读：

| 文档 | 内容 |
| --- | --- |
| `docs/network-run.md` | 安装、启动、端口、防火墙、内网访问 |
| `docs/architecture.md` | 整体架构、进程、目录、数据流 |
| `docs/frontend-maintenance-guide.md` | 前端页面、菜单、路由、状态、构建 |
| `docs/frontend-api-requests.md` | 前端请求封装、新增接口、API 调用方式 |
| `docs/backend-maintenance-guide.md` | Django 后端、模型、迁移、路由、mock 接口 |
| `docs/backend-mock-workflows.md` | 后端 mock 流程、细化方法、真实接口替换点 |
| `docs/sqlite-data-guide.md` | SQLite 表内容查看、修改、ORM 和 SQL 操作 |
| `docs/request-worker-boundary.md` | 哪些请求直连 API，哪些必须走 worker |
| `docs/product-apply-flow.md` | 产品申请从表单到 worker 的完整链路 |
| `docs/search-form-config.md` | 搜索表单字段、联动、产品配置维护 |

## 当前开发原则

- 前端和后端分离维护。
- 页面配置、查询、普通编辑走 Django API。
- 耗时业务动作创建 Job，由 worker 异步执行。
- 任务、调用记录和业务结果需要持久化保存，避免重启后丢失。
- 新增业务流程时优先新增 workflow，不要把耗时逻辑写在普通 API 里。
