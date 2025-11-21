#!/bin/bash
set -e

redis-server --daemonize yes

PG_DATA_DIR="/home/appuser/data"
PG_LOG_FILE="$PG_DATA_DIR/logfile"

if [ ! -d "$PG_DATA_DIR" ]; then
    initdb -D "$PG_DATA_DIR"
fi

pg_ctl -D "$PG_DATA_DIR" -l "$PG_LOG_FILE" start

sleep 5

echo "Starting Node app..."
node dist/index.js
