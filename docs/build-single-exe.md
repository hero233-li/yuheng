# 单机版跨平台打包说明

当前架构是单机本地运行：

```text
Electron 桌面壳
  -> 加载 React 静态页面
  -> 启动本机 Django 后端
  -> 启动本机 worker
  -> SQLite 数据保存在本机
```

没有总机、没有远程升级、没有版本包管理。更新方式是重新打包，然后把新产物发给使用者。

## 支持平台

| 平台 | 建议产物 | 说明 |
| --- | --- | --- |
| Windows | `.exe` | 推荐在 Windows 机器上打包 |
| macOS | `.app` / `.dmg` | 推荐在 macOS 机器上打包 |
| Linux | `AppImage` | 推荐在 Linux 机器上打包 |

原则：在哪个平台运行打包命令，就优先产出该平台的包。

## 安装环境

三端都需要：

```text
Node.js 20+
Python 3.10
```

注意：后端固定使用 Python 3.10。不要用 3.11、3.12 或 3.13 创建虚拟环境。

## 安装依赖

### Windows

```bat
npm install
py -3.10 -m venv .venv
.venv\Scripts\activate
pip install -r apps/backend/requirements.txt
```

### macOS / Linux

```bash
npm install
python3.10 -m venv .venv
source .venv/bin/activate
pip install -r apps/backend/requirements.txt
```

如果你的系统只有 `python`，先确认它是 3.10：

```bash
python --version
python -m venv .venv
```

## 开发启动

三端统一执行：

```bash
npm run dev:branch:all
```

这个命令会同时启动：

```text
Django API: http://127.0.0.1:8766
本地 worker
前端 Vite: http://127.0.0.1:5174
```

## 打包

三端统一执行：

```bash
npm run build:exe
```

这个命令会按顺序执行：

```text
1. npm run build:web
   构建 React 静态资源

2. npm run build:backend
   使用 PyInstaller 构建本平台后端可执行文件

3. npm run build:desktop
   使用 electron-builder 构建桌面应用
```

不要直接跳过 `npm run build:backend` 去执行 `npm run build:desktop`，否则 electron-builder 会找不到 `dist/backend`。

## 产物位置

产物目录：

```text
dist/branch/
```

常见产物：

```text
Windows: dist/branch/intranet-automation-0.1.0.exe
macOS:   dist/branch/内网自动化工具-0.1.0.dmg 或 .app
Linux:   dist/branch/内网自动化工具-0.1.0.AppImage
```

最终文件名会受 electron-builder 当前平台和配置影响，以 `dist/branch/` 里的实际文件为准。

## 为什么之前 Windows 不能跑

旧脚本里有这种写法：

```bash
APP_MODE=branch python3 manage.py runserver
```

这是 macOS/Linux shell 写法，Windows cmd/PowerShell 不支持。

现在已经改成跨平台 Node 脚本：

```text
scripts/backend-command.mjs
scripts/build-backend.mjs
scripts/python-command.mjs
```

它会自动选择：

```text
优先使用项目 .venv 里的 Python
Windows: py -3.10，或 PYTHON 指定的解释器
macOS/Linux: python3.10，或 PYTHON 指定的解释器
```

也会用 Node 注入环境变量，不再依赖 `APP_MODE=branch ...` 这种 shell 语法。
如果检测到 Python 不是 3.10，脚本会直接报错。

## 打包后的运行逻辑

用户双击应用后：

```text
Electron 启动
  -> 自动运行 Django migrate
  -> 启动 127.0.0.1:8766 后端
  -> 启动本地 worker
  -> 打开内置页面
```

用户不需要手动启动前端或后端。

## Windows 常见问题

### 1. python 命令找不到

安装 Python 3.10 时勾选：

```text
Add python.exe to PATH
```

然后重新打开终端，执行：

```bat
python --version
```

必须显示 `3.10.x`。如果电脑上有多个 Python，使用：

```bat
py -3.10 --version
```

### 2. pyinstaller 找不到

先激活虚拟环境：

```bat
.venv\Scripts\activate
```

再安装依赖：

```bat
pip install -r apps/backend/requirements.txt
```

### 3. electron-builder 下载失败

首次打包需要下载 Electron 运行时。内网环境可能失败，建议：

```text
1. 在能联网的机器先打一次包
2. 或配置 npm / Electron 镜像
```

### 4. 拉 Git 后 node_modules 没有

`node_modules` 不会提交到 Git，拉下来后必须执行：

```bash
npm install
```

### 5. 拉 Git 后 .venv 没有

`.venv` 不会提交到 Git，拉下来后必须重新创建：

```bat
py -3.10 -m venv .venv
.venv\Scripts\activate
pip install -r apps/backend/requirements.txt
```

## 更新版本

修改代码后重新执行：

```bash
npm run build:exe
```

然后把新产物发给使用者即可。
