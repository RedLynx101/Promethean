import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('..', import.meta.url));
const services = [
  spawn(process.execPath, ['--import', 'tsx', 'apps/api/src/index.ts'], {
    cwd,
    stdio: 'inherit',
    env: process.env,
  }),
  spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--config', 'apps/web/vite.config.ts'],
    { cwd, stdio: 'inherit', env: process.env },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const service of services) service.kill();
  process.exitCode = code;
}
for (const service of services) {
  service.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  service.on('exit', (code) => stop(code ?? 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
