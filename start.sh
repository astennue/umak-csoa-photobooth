#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:./dev.db"
exec node node_modules/.bin/next dev -p 3000
