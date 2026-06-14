# 内网自动化工具

本仓库现在采用“单机本地运行”架构。

每个用户拿到一个可执行文件，在自己的电脑上独立运行：

- 前端：React + TypeScript + Vite + Ant Design / Ant Design Pro Components
- 桌面壳：Electron
- 后端：Python + Django + SQLite
- 任务执行：本机 SQLite 任务表 + 本地 worker 串行执行
- 数据存储：保存在本机，不依赖总机或服务器
- 更新方式：手动重新打包 exe，然后发给使用者覆盖新版

## 开发启动

第一次准备环境：

```bash
npm install
python3 -m venv .venv
. .venv/bin/activate
pip install -r apps/backend/requirements.txt
npm run backend:migrate
```

一条命令启动本机开发环境：

```bash
npm run dev:branch:all
```

这个命令会同时启动：

```text
Django API: http://127.0.0.1:8766
本地 worker
前端 Vite: http://127.0.0.1:5174
```

## 打包 exe

详细打包说明见：

```text
docs/build-single-exe.md
```

Windows 上最终执行：

```bash
npm run build:exe
```

打包产物在：

```text
dist/branch/intranet-automation-0.1.0.exe
```

这是 portable exe，不需要安装，双击即可运行。

## 文档

产品申请从前端到 worker 的完整链路、字段/产品/状态维护方式：

```text
docs/product-apply-flow.md
```

分机端搜索表单字段、联动关系、宽度、默认值、是否可编辑和是否提交：

```text
docs/search-form-config.md
```

前端请求后端的封装方式和新增接口方法：

```text
docs/frontend-api-requests.md
```

前端页面维护、新增页面、搜索栏和结果区扩展：

```text
docs/frontend-maintenance-guide.md
```

哪些请求直连 Django API、哪些执行动作必须走 worker：

```text
docs/request-worker-boundary.md
```
