import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const children = [];

const startChild = (scriptPath, label) => {
  const child = spawn(process.execPath, [scriptPath], {
    stdio: 'inherit',
    env: process.env,
    windowsHide: false
  });

  child.on('exit', (code, signal) => {
    if (code !== 0 && signal == null) {
      console.error(`${label} exited with code ${code}`);
    }
    process.exit(code ?? (signal ? 1 : 0));
  });

  children.push(child);
  return child;
};

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startChild(fileURLToPath(new URL('../public-server.js', import.meta.url)), 'public server');
startChild(fileURLToPath(new URL('../admin-app.js', import.meta.url)), 'admin server');