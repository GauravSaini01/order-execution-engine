#!/bin/bash
redis-server --daemonize yes

if [ ! -d "/var/lib/postgresql/data" ]; then
    initdb -D /var/lib/postgresql/data
fi

pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/logfile start

sleep 5

echo "Starting Node app..."
node dist/index.js
