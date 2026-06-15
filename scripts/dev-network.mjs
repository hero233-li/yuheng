import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const commands = [
  ['backend', [npm, ['run', 'backend:branch']]],
  ['worker', [npm, ['run', 'backend:worker']]],
  ['web', [npm, ['run', 'dev:branch']]],
];

const children = [];

function start(label, command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    shell: false,
    env: {
      ...process.env,
      BACKEND_HOST: process.env.BACKEND_HOST || '0.0.0.0',
      WEB_HOST: process.env.WEB_HOST || '0.0.0.0',
      VITE_API_PROXY_TARGET: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8766',
    },
  });

  children.push(child);

  child.stdout.on('data', (chunk) => {
    process.stdout.write(prefix(label, chunk));
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(prefix(label, chunk));
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      return;
    }
    process.stdout.write(`[${label}] exited with code ${code}\n`);
    stopAll();
    process.exit(code ?? 0);
  });
}

function prefix(label, chunk) {
  return chunk
    .toString()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => `[${label}] ${line}\n`)
    .join('');
}

function stopAll() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAll();
  process.exit(0);
});

for (const [label, [command, args]] of commands) {
  start(label, command, args);
}
