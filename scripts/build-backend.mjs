import { spawnSync } from 'node:child_process';
import { getPythonCommand } from './python-command.mjs';

const python = getPythonCommand();
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

process.exit(result.status ?? 1);
