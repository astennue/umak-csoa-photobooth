#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="postgresql://postgres.ctopipbiminfxcjrkxij:rmJ9mk1ochTDYmNb@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=20"
export DIRECT_URL="postgresql://postgres:rmJ9mk1ochTDYmNb@db.ctopipbiminfxcjrkxij.supabase.co:5432/postgres"
export NEXTAUTH_SECRET="umak-csoa-photobooth-secret-key-2024"
export NEXTAUTH_URL="http://localhost:3000"
export ENCRYPTION_KEY="umak-csoa-encryption-key-32ch"
exec node node_modules/.bin/next dev -p 3000
