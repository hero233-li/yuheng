import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function getPythonCommand() {
  if (process.env.PYTHON) {
    const command = path.isAbsolute(process.env.PYTHON)
      ? process.env.PYTHON
      : path.resolve(process.cwd(), process.env.PYTHON);
    assertPython310(command, []);
    return { command, args: [] };
  }

  const venvPython = process.platform === 'win32'
    ? path.resolve(process.cwd(), '.venv', 'Scripts', 'python.exe')
    : path.resolve(process.cwd(), '.venv', 'bin', 'python');

  const candidates = [
    ...(fs.existsSync(venvPython) ? [{ command: venvPython, args: [] }] : []),
    ...(process.platform === 'win32'
    ? [
        { command: 'py', args: ['-3.10'] },
        { command: 'python', args: [] },
      ]
    : [
        { command: 'python3.10', args: [] },
        { command: 'python3', args: [] },
        { command: 'python', args: [] },
      ]),
  ];

  for (const candidate of candidates) {
    if (isPython310(candidate.command, candidate.args)) {
      return candidate;
    }
  }

  console.error('未找到 Python 3.10。请安装 Python 3.10，或设置 PYTHON 指向 Python 3.10 可执行文件。');
  console.error('Windows 示例：set PYTHON=C:\\Python310\\python.exe');
  console.error('macOS/Linux 示例：export PYTHON=/usr/local/bin/python3.10');
  process.exit(1);
}

export function assertPython310(command, args = []) {
  const result = spawnSync(command, [...args, '-c', 'import sys; print(str(sys.version_info.major) + "." + str(sys.version_info.minor))'], {
    encoding: 'utf-8',
    shell: false,
  });
  const version = (result.stdout || '').trim();
  const error = (result.stderr || '').trim();
  if (result.status !== 0 || version !== '3.10') {
    console.error(`当前 Python 版本不是 3.10：${version || '无法识别'}`);
    if (error) {
      console.error(error);
    }
    console.error('请使用 Python 3.10 重新创建虚拟环境并安装依赖。');
    process.exit(1);
  }
}

function isPython310(command, args) {
  const result = spawnSync(command, [...args, '-c', 'import sys; print(str(sys.version_info.major) + "." + str(sys.version_info.minor))'], {
    encoding: 'utf-8',
    shell: false,
  });
  return result.status === 0 && (result.stdout || '').trim() === '3.10';
}
