#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export NEXTAUTH_SECRET="umak-csoa-photobooth-secret-key-2024"
export ENCRYPTION_KEY="umak-csoa-encryption-key-32ch"
exec node node_modules/.bin/next dev -p 3000
