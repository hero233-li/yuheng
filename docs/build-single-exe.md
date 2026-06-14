# 单机版 exe 打包说明

当前架构已经收敛为“单机本地运行”：

```text
Electron 桌面壳
  -> 加载 React 静态页面
  -> 启动本机 Django 后端
  -> 启动本机 worker
  -> SQLite 数据保存在本机
```

没有总机、没有远程升级、没有版本包管理。更新方式是你重新打包一个 exe，手动发给使用者。

## 打包产物

Windows 打包完成后会生成：

```text
dist/branch/intranet-automation-0.1.0.exe
```

这个文件是 portable exe：

```text
不需要安装
不需要服务器
双击运行
```

## Windows 打包步骤

建议在 Windows x64 电脑上打包，因为最终目标是 Windows exe。

### 1. 安装环境

安装：

```text
Node.js 20+
Python 3.10+
```

### 2. 安装依赖

在项目根目录执行：

```bash
npm install
python -m venv .venv
.venv\Scripts\activate
pip install -r apps/backend/requirements.txt
```

### 3. 打包

在项目根目录执行：

```bash
npm run build:exe
```

这个命令会做三件事：

```text
1. npm run build:branch -w apps/web
   构建 React 静态资源

2. npm run build:backend
   使用 PyInstaller 构建 Django 后端 backend.exe

3. npm run build:branch -w apps/desktop
   使用 electron-builder 生成最终 portable exe
```

### 4. 发送给别人

把这个文件发给别人：

```text
dist/branch/intranet-automation-0.1.0.exe
```

对方双击即可运行。

## 打包后的运行逻辑

用户双击 exe 后：

```text
Electron 启动
  -> 自动运行 Django migrate
  -> 启动 127.0.0.1:8766 后端
  -> 启动本地 worker
  -> 打开内置页面
```

用户看不到命令行窗口。

## 本机数据位置

Django 默认数据目录：

```text
apps/backend/data/branch
```

打包后建议后续改成用户目录，例如：

```text
%APPDATA%\IntranetAutomation\data
```

当前版本先保持项目内默认数据目录，后续如果要让升级覆盖 exe 时保留数据，再把 `AUTOMATION_DATA_DIR` 固定到用户目录。

## 常见问题

### 1. npm run build:backend 提示 pyinstaller 找不到

确认已经激活虚拟环境，并安装依赖：

```bash
.venv\Scripts\activate
pip install -r apps/backend/requirements.txt
```

### 2. electron-builder 下载失败

首次打包需要下载 Electron 运行时。内网环境可能失败，建议在能联网的机器先打一次包，或配置 npm/electron 镜像。

### 3. 打包后双击没反应

先在开发环境确认：

```bash
npm run dev:branch:all
```

如果开发环境正常，再检查：

```text
dist/backend/backend.exe 是否存在
apps/web/dist/branch/index.html 是否存在
```

### 4. 要更新版本怎么办

修改代码后重新执行：

```bash
npm run build:exe
```

把新的 exe 发给别人即可。

