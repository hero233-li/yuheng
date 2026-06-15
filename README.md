# 内网自动化工具

本仓库当前采用“前后端分离 + 本机内网服务”架构，不再优先维护 Electron 桌面壳。

- 前端：React + TypeScript + Vite + Ant Design / Ant Design Pro Components
- 后端：Python 3.10 + Django + SQLite
- 任务执行：本机 SQLite 任务表 + 本地 worker 串行执行
- 访问方式：本机启动服务，局域网/内网浏览器访问
- 当前推荐版本：Node 22.12.10，Python 3.10.11

## 开发和内网启动

第一次准备环境：

```bash
npm install
python3.10 -m venv .venv
. .venv/bin/activate
pip install -r apps/backend/requirements.txt
npm run backend:migrate
```

Windows PowerShell：

```powershell
npm install
py -3.10 -m venv .venv
.venv\Scripts\activate
pip install -r apps/backend/requirements.txt
npm run backend:migrate
```

一条命令启动前端、后端和 worker：

```bash
npm run dev
```

启动后：

```text
React 前端：http://本机IP:5174
Django API：http://本机IP:8766
本地 worker：随 npm run dev 一起启动
```

同一台电脑访问：

```text
http://127.0.0.1:5174
```

内网其他电脑访问：

```text
http://启动服务那台电脑的IP:5174
```

前端请求 `/api` 会由 Vite 代理到本机 Django 后端。

## 构建前端

```bash
npm run build
```

产物在：

```text
apps/web/dist/branch/
```

## 文档

内网 Web 版启动和维护：

```text
docs/network-run.md
```

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
