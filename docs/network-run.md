# 内网运行说明

## 运行模式

当前运行方式：

```text
React/Vite 前端：5174
Django API 后端：8766
worker：独立进程
数据库：持久化数据文件
```

启动服务的电脑负责运行前端、后端和 worker。其他内网电脑通过浏览器访问前端地址。

## 环境版本

推荐：

```text
Node：22.12.10
Python：3.10.11
```

Python 必须是 3.10。脚本会优先使用：

```text
.venv
Windows py -3.10
macOS/Linux python3.10
```

## 第一次安装

Windows PowerShell：

```powershell
git pull
npm install
py -3.10 -m venv .venv
.venv\Scripts\activate
pip install -r apps/backend/requirements.txt
npm run backend:migrate
```

macOS/Linux：

```bash
git pull
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

该命令启动三个子进程：

| 子进程 | 实际命令 | 说明 |
| --- | --- | --- |
| backend | `npm run backend:web` | Django API |
| worker | `npm run backend:worker` | 任务执行 |
| web | `npm run dev:web` | React/Vite 前端 |

## 访问地址

浏览器访问：

```text
http://127.0.0.1:5174
```

内网访问：

```text
http://启动服务电脑的IP:5174
```

示例：

```text
http://192.168.1.20:5174
```

## 请求代理

前端页面调用后端时使用 `/api/...`。

Vite 代理链路：

```text
浏览器
  -> http://服务电脑IP:5174/api/jobs/
  -> Vite proxy
  -> Django 8766 /api/jobs/
```

配置位置：

```text
apps/web/vite.config.ts
```

默认代理目标：

```text
http://127.0.0.1:8766
```

## 端口和环境变量

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

前端代理后端：

```powershell
$env:VITE_API_PROXY_TARGET="http://127.0.0.1:8766"
npm run dev
```

数据目录：

```powershell
$env:AUTOMATION_DATA_DIR="D:\automation-data"
npm run dev
```

macOS/Linux 写法：

```bash
BACKEND_PORT=8767 npm run dev
```

## 单独启动

只启动后端：

```bash
npm run backend:web
```

只启动 worker：

```bash
npm run backend:worker
```

只启动前端：

```bash
npm run dev:web
```

只执行数据库迁移：

```bash
npm run backend:migrate
```

## 构建前端

```bash
npm run build
```

产物：

```text
apps/web/dist/web/
```

构建产物用于静态部署或后续集成，不影响 `npm run dev`。

## 防火墙

如果其他电脑不能访问：

```text
1. 确认两台电脑在同一内网
2. 确认访问的是启动服务电脑的真实 IP
3. Windows 防火墙放行 Node.js
4. Windows 防火墙放行 5174 端口
5. 如需直接访问 API，再放行 8766 端口
```

PowerShell 查看本机 IP：

```powershell
ipconfig
```

## 常见问题

### 1. 端口被占用

修改端口：

```powershell
$env:BACKEND_PORT="8767"
npm run dev
```

前端端口当前固定在 Vite 配置中：

```text
apps/web/vite.config.ts
```

### 2. Python 版本错误

确认：

```powershell
py -3.10 --version
```

重新建虚拟环境：

```powershell
Remove-Item -Recurse -Force .venv
py -3.10 -m venv .venv
.venv\Scripts\activate
pip install -r apps/backend/requirements.txt
```

### 3. 数据表不存在

执行：

```bash
npm run backend:migrate
```

### 4. 页面提交后任务不动

确认 worker 是否启动：

```bash
npm run backend:worker
```

### 5. 前端请求失败

检查：

```text
apps/web/.env.web
apps/web/vite.config.ts
scripts/dev-network.mjs
```
