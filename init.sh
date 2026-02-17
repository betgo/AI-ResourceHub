#!/bin/bash

# =============================================================================
# init.sh - Project Initialization Script (Codex)
# =============================================================================
# 1) Detect app directory
# 2) Install dependencies (if app exists)
# 3) Start development server in background
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
PID_FILE=".dev-server.pid"
LOG_DIR="automation-logs"

find_app_dir() {
    if [ -n "${APP_DIR:-}" ] && [ -f "${APP_DIR}/package.json" ]; then
        echo "$APP_DIR"
        return 0
    fi

    if [ -f "resource-hub/package.json" ]; then
        echo "resource-hub"
        return 0
    fi

    local detected
    detected=$(find . -maxdepth 2 -name package.json \
        -not -path "./node_modules/*" \
        -not -path "./.git/*" \
        | head -n 1 || true)

    if [ -n "$detected" ]; then
        dirname "$detected" | sed 's|^\./||'
        return 0
    fi

    return 1
}

kill_existing_server() {
    if [ -f "$PID_FILE" ]; then
        local old_pid
        old_pid=$(cat "$PID_FILE")
        if ps -p "$old_pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping previous dev server (PID: $old_pid)...${NC}"
            kill "$old_pid" || true
        fi
        rm -f "$PID_FILE"
    fi
}

echo -e "${YELLOW}Initializing ResourceHub project...${NC}"

if ! APP_PATH=$(find_app_dir); then
    echo -e "${YELLOW}No app directory found yet.${NC}"
    echo "Expected: resource-hub/package.json (or set APP_DIR manually)."
    echo "You can continue with scaffolding task first."
    exit 0
fi

echo "Detected app directory: $APP_PATH"

echo "Installing dependencies..."
(
    cd "$APP_PATH"
    npm install
)

kill_existing_server

mkdir -p "$LOG_DIR"

echo "Starting development server..."
(
    cd "$APP_PATH"
    npm run dev > "../$LOG_DIR/dev-server.log" 2>&1 &
    echo $! > "../$PID_FILE"
)

sleep 3

echo -e "${GREEN}Initialization complete.${NC}"
echo -e "${GREEN}Dev server should be available at http://localhost:3000${NC}"
echo "PID: $(cat "$PID_FILE")"
echo "Log: $LOG_DIR/dev-server.log"
