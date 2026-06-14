import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const desktopDir = path.join(root, 'apps', 'desktop');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const env = {
  ...process.env,
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
};

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: desktopDir,
    env,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(npx, ['tsc', '-p', 'tsconfig.json']);
run(npx, ['electron-builder', '--config', '../../configs/electron.branch.yml']);
