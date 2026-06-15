import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { getPythonCommand } from './python-command.mjs';

const action = process.argv[2] || 'runserver';
const root = process.cwd();
const backendCwd = path.join(root, 'apps', 'backend');
const python = getPythonCommand();
const backendHost = process.env.BACKEND_HOST || '0.0.0.0';
const backendPort = process.env.BACKEND_PORT || '8766';
const env = {
  ...process.env,
  APP_MODE: 'web',
  PYTHONUNBUFFERED: '1',
};

function runSync(args) {
  const result = spawnSync(python.command, [...python.args, 'manage.py', ...args], {
    cwd: backendCwd,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runLong(args) {
  const child = spawn(python.command, [...python.args, 'manage.py', ...args], {
    cwd: backendCwd,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

if (action === 'migrate') {
  runSync(['migrate', '--noinput']);
} else if (action === 'runserver') {
  runSync(['migrate', '--noinput']);
  runLong(['runserver', `${backendHost}:${backendPort}`, '--noreload']);
} else if (action === 'runworker') {
  runSync(['migrate', '--noinput']);
  runLong(['runworker']);
} else {
  console.error(`Unknown backend action: ${action}`);
  process.exit(1);
}
