/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const fs = require('fs');

const env = {
  ...process.env,
  DATABASE_URL: 'file:/home/z/my-project/db/custom.db',
  NEXTAUTH_SECRET: 'umak-csoa-photobooth-secret-key-2024',
  ENCRYPTION_KEY: 'umak-csoa-encryption-key-32ch',
  PORT: '3000'
};
const child = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3000'], {
  cwd: '/home/z/my-project',
  env,
  detached: true,
  stdio: 'ignore'
});

child.unref();

fs.writeFileSync('/tmp/nextjs.pid', child.pid.toString());
console.log('Next.js started with PID:', child.pid);
