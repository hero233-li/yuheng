# 内网 Web 版运行说明

## 目标

当前项目改为前后端分离运行：

```text
React/Vite 前端：5174
Django API 后端：8766
本地 worker：独立进程
SQLite：本机数据文件
```

不再优先使用 Electron，也不再把项目打成桌面 exe。

## 版本

推荐版本：

```text
Node：22.12.10
Python：3.10.11
```

Python 版本必须是 3.10。

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

## 一条命令启动

```bash
npm run dev
```

这个命令会同时启动：

```text
backend: Django API
worker:  本地任务执行进程
web:     React/Vite 前端
```

默认监听：

```text
React：http://0.0.0.0:5174
Django：http://0.0.0.0:8766
```

本机访问：

```text
http://127.0.0.1:5174
```

内网其他电脑访问：

```text
http://启动服务电脑的IP:5174
```

## 请求链路

浏览器访问 React：

```text
浏览器 -> http://本机IP:5174
```

前端调用后端：

```text
浏览器 -> /api/... -> Vite proxy -> http://127.0.0.1:8766/api/...
```

这样内网其他电脑只需要访问 `5174`，后端可以继续由启动服务的电脑本机代理。

## 自定义端口和地址

后端监听地址：

```powershell
$env:BACKEND_HOST="0.0.0.0"
$env:BACKEND_PORT="8766"
npm run dev
```

前端监听地址：

```powershell
$env:WEB_HOST="0.0.0.0"
npm run dev
```

前端代理后端地址：

```powershell
$env:VITE_API_PROXY_TARGET="http://127.0.0.1:8766"
npm run dev
```

## 防火墙

如果其他电脑打不开：

```text
1. 确认启动服务的电脑和访问电脑在同一内网
2. 确认访问地址是启动服务电脑的真实 IP
3. Windows 防火墙放行 Node.js 或 5174 端口
4. 如果需要直接访问 Django API，再放行 8766 端口
```

## 单独启动

只启动后端：

```bash
npm run backend:branch
```

只启动 worker：

```bash
npm run backend:worker
```

只启动前端：

```bash
npm run dev:branch
```

## 构建前端

```bash
npm run build
```

构建产物：

```text
apps/web/dist/branch/
```
