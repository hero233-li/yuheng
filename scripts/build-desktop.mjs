import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const desktopDir = path.join(root, 'apps', 'desktop');
const binDir = path.join(root, 'node_modules', '.bin');
const env = {
  ...process.env,
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
};

function localBin(name) {
  const filename = process.platform === 'win32' ? `${name}.cmd` : name;
  const command = path.join(binDir, filename);

  if (!fs.existsSync(command)) {
    console.error(`未找到本地命令：${command}`);
    console.error('请先在项目根目录执行 npm install。');
    process.exit(1);
  }

  return command;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: desktopDir,
    env,
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    console.error(`执行命令失败：${command}`);
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(localBin('tsc'), ['-p', 'tsconfig.json']);
run(localBin('electron-builder'), ['--config', '../../configs/electron.branch.yml']);
