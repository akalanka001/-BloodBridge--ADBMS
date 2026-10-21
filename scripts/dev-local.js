import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('======================================================');
console.log('🚀 Starting BloodBridge Local Development (NO DOCKER)');
console.log('======================================================');
console.log('Backend API:  http://127.0.0.1:4000');
console.log('Frontend UI:  http://localhost:5173');
console.log('Press Ctrl+C at any time to stop both servers.\n');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// Start backend (node is a binary executable, no shell needed)
const backend = spawn('node', ['--watch', 'backend/src/server.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, PORT: '4000' },
});

// Start frontend (npm on Windows is a .cmd batch file, which requires shell: true)
const frontend = spawn(npmCmd, ['--prefix', 'frontend', 'run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: isWindows,
});

let isShuttingDown = false;
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n🛑 Stopping BloodBridge local servers...');
  if (isWindows) {
    if (backend?.pid) {
      try {
        execSync(`taskkill /pid ${backend.pid} /T /F`, { stdio: 'ignore' });
      } catch {}
    }
    if (frontend?.pid) {
      try {
        execSync(`taskkill /pid ${frontend.pid} /T /F`, { stdio: 'ignore' });
      } catch {}
    }
  } else {
    try {
      backend.kill();
    } catch {}
    try {
      frontend.kill();
    } catch {}
  }
  process.exit(0);
}

backend.on('error', (err) => {
  console.error('[Backend Error]:', err);
});

frontend.on('error', (err) => {
  console.error('[Frontend Error]:', err);
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
