#!/bin/bash

# =============================================================================
# run-automation.sh - Codex Automated Task Runner
# =============================================================================
# This script runs Codex multiple times in a loop to automatically
# complete tasks defined in task.json.
#
# Usage: ./run-automation.sh <number_of_runs>
# Example: ./run-automation.sh 5
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

LOG_DIR="./automation-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/automation-$(date +%Y%m%d_%H%M%S).log"

log() {
    local level=$1
    local message=$2
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" >> "$LOG_FILE"

    case "$level" in
        INFO) echo -e "${BLUE}[INFO]${NC} ${message}" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} ${message}" ;;
        WARNING) echo -e "${YELLOW}[WARNING]${NC} ${message}" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} ${message}" ;;
        PROGRESS) echo -e "${CYAN}[PROGRESS]${NC} ${message}" ;;
    esac
}

count_remaining_tasks() {
    if [ -f "task.json" ]; then
        grep -c '"passes": false' task.json 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

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

if [ -z "${1:-}" ]; then
    echo "Usage: $0 <number_of_runs>"
    echo "Example: $0 5"
    exit 1
fi

if ! [[ "$1" =~ ^[0-9]+$ ]]; then
    echo "Error: Argument must be a positive integer"
    exit 1
fi

if [ "$1" -le 0 ]; then
    echo "Error: Argument must be greater than 0"
    exit 1
fi

if ! command -v codex > /dev/null 2>&1; then
    echo "Error: codex command not found. Please install Codex CLI first."
    exit 1
fi

TOTAL_RUNS=$1
APP_PATH=""
if APP_PATH=$(find_app_dir); then
    log "INFO" "Detected app directory: $APP_PATH"
else
    log "WARNING" "No app directory detected yet; bootstrap task may be required."
fi

echo ""
echo "========================================"
echo "  Codex Automation Runner"
echo "========================================"
echo ""

log "INFO" "Starting automation with $TOTAL_RUNS runs"
log "INFO" "Log file: $LOG_FILE"

if [ ! -f "task.json" ]; then
    log "ERROR" "task.json not found! Please run this script from the project root."
    exit 1
fi

INITIAL_TASKS=$(count_remaining_tasks)
log "INFO" "Tasks remaining at start: $INITIAL_TASKS"

for ((run=1; run<=TOTAL_RUNS; run++)); do
    echo ""
    echo "========================================"
    log "PROGRESS" "Run $run of $TOTAL_RUNS"
    echo "========================================"

    REMAINING=$(count_remaining_tasks)

    if [ "$REMAINING" -eq 0 ]; then
        log "SUCCESS" "All tasks completed! No more tasks to process."
        log "INFO" "Automation finished early after $((run-1)) runs"
        exit 0
    fi

    log "INFO" "Tasks remaining before this run: $REMAINING"

    RUN_START=$(date +%s)
    RUN_LOG="$LOG_DIR/run-${run}-$(date +%Y%m%d_%H%M%S).log"

    log "INFO" "Starting Codex session..."
    log "INFO" "Run log: $RUN_LOG"

    PROMPT_FILE=$(mktemp)
    cat > "$PROMPT_FILE" <<PROMPT_EOF
Please follow the workflow in AGENT.md:
1. Read task.json and select the next task with passes: false
2. Implement the task following all listed steps
3. Test thoroughly (run npm run lint and npm run build in ${APP_PATH:-resource-hub}/ when available)
4. Update progress.txt with your work
5. Update task.json only when all checks pass
6. Commit all related changes in a single commit

Start by reading task.json to find your task.
Please complete only one task in this session, and stop once done or blocked.
PROMPT_EOF

    set +e
    codex exec --dangerously-bypass-approvals-and-sandbox < "$PROMPT_FILE" 2>&1 | tee "$RUN_LOG"
    EXIT_CODE=${PIPESTATUS[0]}
    set -e

    RUN_END=$(date +%s)
    RUN_DURATION=$((RUN_END - RUN_START))

    if [ "$EXIT_CODE" -eq 0 ]; then
        log "SUCCESS" "Run $run completed in ${RUN_DURATION} seconds"
    else
        log "WARNING" "Run $run finished with exit code $EXIT_CODE after ${RUN_DURATION} seconds"
    fi

    rm -f "$PROMPT_FILE"

    REMAINING_AFTER=$(count_remaining_tasks)
    COMPLETED=$((REMAINING - REMAINING_AFTER))

    if [ "$COMPLETED" -gt 0 ]; then
        log "SUCCESS" "Task(s) completed this run: $COMPLETED"
    else
        log "WARNING" "No tasks marked as completed this run"
    fi

    log "INFO" "Tasks remaining after run $run: $REMAINING_AFTER"

    echo "" >> "$LOG_FILE"
    echo "----------------------------------------" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"

    if [ "$run" -lt "$TOTAL_RUNS" ]; then
        log "INFO" "Waiting 2 seconds before next run..."
        sleep 2
    fi
done

echo ""
echo "========================================"
log "SUCCESS" "Automation completed!"
echo "========================================"

FINAL_REMAINING=$(count_remaining_tasks)
TOTAL_COMPLETED=$((INITIAL_TASKS - FINAL_REMAINING))

log "INFO" "Summary:"
log "INFO" "  - Total runs: $TOTAL_RUNS"
log "INFO" "  - Tasks completed: $TOTAL_COMPLETED"
log "INFO" "  - Tasks remaining: $FINAL_REMAINING"
log "INFO" "  - Log file: $LOG_FILE"

if [ "$FINAL_REMAINING" -eq 0 ]; then
    log "SUCCESS" "All tasks have been completed!"
else
    log "WARNING" "Some tasks remain. You may need to run more iterations."
fi
