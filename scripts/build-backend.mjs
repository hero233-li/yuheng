import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getPythonCommand } from './python-command.mjs';

const python = getPythonCommand();
const root = process.cwd();
const backendDist = path.join(root, 'dist', 'backend');
const backendExe = process.platform === 'win32'
  ? path.join(backendDist, 'backend.exe')
  : path.join(backendDist, 'backend');

fs.rmSync(backendDist, { recursive: true, force: true });
fs.rmSync(path.join(root, 'dist', 'backend.exe'), { force: true });

const result = spawnSync(
  python.command,
  [...python.args, '-m', 'PyInstaller', 'configs/backend.pyinstaller.spec', '--noconfirm', '--clean'],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      APP_MODE: 'branch',
      PYTHONUNBUFFERED: '1',
    },
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!fs.existsSync(backendExe)) {
  console.error(`后端打包产物不存在：${backendExe}`);
  console.error('请检查 PyInstaller 输出日志。');
  process.exit(1);
}

process.exit(result.status ?? 1);
