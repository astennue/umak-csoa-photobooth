/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const fs = require('fs');

const env = {
  ...process.env,
  DATABASE_URL: 'postgresql://postgres.ctopipbiminfxcjrkxij:rmJ9mk1ochTDYmNb@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=20',
  DIRECT_URL: 'postgresql://postgres.ctopipbiminfxcjrkxij:rmJ9mk1ochTDYmNb@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres',
  NEXTAUTH_SECRET: 'umak-csoa-photobooth-secret-key-2024',
  NEXTAUTH_URL: 'http://localhost:3000',
  ENCRYPTION_KEY: 'umak-csoa-encryption-key-32ch',
  PORT: '3000'
};

const log = fs.openSync('/home/z/my-project/dev.log', 'a');

const child = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3000'], {
  cwd: '/home/z/my-project',
  env,
  detached: true,
  stdio: ['ignore', log, log]
});

child.unref();

fs.writeFileSync('/tmp/nextjs.pid', child.pid.toString());
console.log('Next.js started with PID:', child.pid);
