import { app, BrowserWindow } from 'electron';
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webPort = 5174;
const backendPort = 8766;
let backendProcess: ChildProcessWithoutNullStreams | undefined;
let workerProcess: ChildProcessWithoutNullStreams | undefined;

function pythonCommand() {
  if (process.env.PYTHON) {
    return { command: process.env.PYTHON, args: [] };
  }
  if (process.platform === 'win32') {
    return { command: 'py', args: ['-3.10'] };
  }
  return { command: 'python3.10', args: [] };
}

function backendCwd() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }
  return path.resolve(__dirname, '../../backend');
}

function startPythonProcess(args: string[]) {
  const env = {
    ...process.env,
    APP_MODE: 'branch',
    PYTHONUNBUFFERED: '1',
  };

  if (app.isPackaged) {
    const executable = process.platform === 'win32' ? 'backend.exe' : 'backend';
    return spawn(path.join(backendCwd(), executable), args, { cwd: backendCwd(), env });
  }

  const python = pythonCommand();
  return spawn(python.command, [...python.args, 'manage.py', ...args], {
    cwd: backendCwd(),
    env,
    shell: process.platform === 'win32',
  });
}

function runBackendCommand(args: string[]) {
  const env = {
    ...process.env,
    APP_MODE: 'branch',
    PYTHONUNBUFFERED: '1',
  };

  if (app.isPackaged) {
    const executable = process.platform === 'win32' ? 'backend.exe' : 'backend';
    return spawnSync(path.join(backendCwd(), executable), args, {
      cwd: backendCwd(),
      env,
      stdio: 'ignore',
    });
  }

  const python = pythonCommand();
  return spawnSync(python.command, [...python.args, 'manage.py', ...args], {
    cwd: backendCwd(),
    env,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
}

function startBackend() {
  runBackendCommand(['migrate', '--noinput']);

  backendProcess = startPythonProcess(['runserver', `127.0.0.1:${backendPort}`]);
  workerProcess = startPythonProcess(['runworker']);
}

function stopBackend() {
  workerProcess?.kill();
  backendProcess?.kill();
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1100,
    minHeight: 720,
    title: '内网自动化工具',
  });

  if (!app.isPackaged) {
    await win.loadURL(`http://127.0.0.1:${webPort}`);
    return;
  }

  const indexPath = path.join(process.resourcesPath, 'web', 'branch', 'index.html');
  await win.loadFile(indexPath);
}

app.whenReady().then(() => {
  startBackend();
  void createWindow();
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', stopBackend);
