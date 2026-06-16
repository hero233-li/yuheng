import { spawn } from 'node:child_process';

const npm = getNpmCommand();
const commands = [
  ['backend', npmArgs('backend:web')],
  ['worker', npmArgs('backend:worker')],
  ['web', npmArgs('dev:web')],
];

const children = [];

function getNpmCommand() {
  if (process.env.npm_execpath) {
    return {
      command: process.execPath,
      baseArgs: [process.env.npm_execpath],
      shell: false,
    };
  }
  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    baseArgs: [],
    shell: process.platform === 'win32',
  };
}

function npmArgs(scriptName) {
  return [npm.command, [...npm.baseArgs, 'run', scriptName], npm.shell];
}

function start(label, command, args, shell) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    shell,
    env: {
      ...process.env,
      BACKEND_HOST: process.env.BACKEND_HOST || '0.0.0.0',
      WEB_HOST: process.env.WEB_HOST || '0.0.0.0',
      VITE_API_PROXY_TARGET: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8766',
    },
  });

  children.push(child);

  child.on('error', (error) => {
    process.stderr.write(`[${label}] failed to start: ${error.message}\n`);
    stopAll();
    process.exit(1);
  });

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

for (const [label, [command, args, shell]] of commands) {
  start(label, command, args, shell);
}
