import { spawn } from 'node:child_process';

const commands = [
  ['backend:branch', ['npm', ['run', 'backend:branch']]],
  ['backend:worker', ['npm', ['run', 'backend:worker']]],
  ['dev:branch', ['npm', ['run', 'dev:branch']]],
];

const children = [];

function start(label, command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    shell: process.platform === 'win32',
    env: process.env,
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
