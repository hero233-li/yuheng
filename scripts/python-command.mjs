import { spawnSync } from 'node:child_process';
import path from 'node:path';

export function getPythonCommand() {
  if (process.env.PYTHON) {
    return path.isAbsolute(process.env.PYTHON)
      ? process.env.PYTHON
      : path.resolve(process.cwd(), process.env.PYTHON);
  }

  const candidates = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  for (const command of candidates) {
    const result = spawnSync(command, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
    if (result.status === 0) {
      return command;
    }
  }

  return process.platform === 'win32' ? 'python' : 'python3';
}
