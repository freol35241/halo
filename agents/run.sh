#!/usr/bin/env bash
set -euo pipefail

# HALO Dual-Agent Build Loop
# Alternates between a build agent and a review agent until all tasks are complete.
# Uses the filesystem (tasks/) as shared memory between agents.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

MAX_TASK=020
MAX_ATTEMPTS=5

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[HALO]${NC} $1"; }
success() { echo -e "${GREEN}[HALO]${NC} $1"; }
warn() { echo -e "${YELLOW}[HALO]${NC} $1"; }
error() { echo -e "${RED}[HALO]${NC} $1"; }

get_current_task() {
    grep '^**Task:**' tasks/current-task.md | sed 's/.*\*\* //'
}

get_current_phase() {
    grep '^**Phase:**' tasks/current-task.md | sed 's/.*\*\* //'
}

get_current_attempts() {
    grep '^**Attempts:**' tasks/current-task.md | sed 's/.*\*\* //'
}

log "=== HALO Dual-Agent Build System ==="
log "Project: $PROJECT_DIR"
log ""

while true; do
    TASK=$(get_current_task)
    PHASE=$(get_current_phase)
    ATTEMPTS=$(get_current_attempts)

    # Check if we've exceeded the max task
    if [ "$TASK" -gt "$MAX_TASK" ] 2>/dev/null; then
        success "=== ALL TASKS COMPLETE ==="
        exit 0
    fi

    TASK_FILE="tasks/$(printf '%03d' "$TASK")-*.md"
    # Resolve the glob
    TASK_FILE=$(ls $TASK_FILE 2>/dev/null | head -1)

    if [ -z "$TASK_FILE" ]; then
        error "Task file not found for task $TASK"
        exit 1
    fi

    # Check attempt limit
    if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
        error "Task $TASK has failed $ATTEMPTS times. Stopping for manual intervention."
        error "Check $TASK_FILE for details."
        exit 1
    fi

    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Task: $TASK | Phase: $PHASE | Attempt: $((ATTEMPTS + 1))"
    log "File: $TASK_FILE"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ "$PHASE" = "build" ]; then
        log "Launching BUILD agent (sonnet)..."

        # Update current-task to show build in progress
        cat > tasks/current-task.md << EOF
# Current Task

This file is updated by the orchestrator loop to point to the active task.

**Task:** $TASK
**File:** $TASK_FILE
**Phase:** build
**Attempts:** $ATTEMPTS
EOF

        BUILD_LOG="tasks/logs/build-$(printf '%03d' "$TASK")-attempt-$((ATTEMPTS + 1))"
        claude -p "$(cat agents/build-prompt.md)" \
            --model sonnet \
            --output-format stream-json \
            --verbose \
            --allowedTools "Read,Write,Edit,Bash,Glob,Grep" \
            2>&1 | tee "${BUILD_LOG}.jsonl" | agents/format-log.sh | tee "${BUILD_LOG}.log" || true

        # After build agent finishes, check if it marked the task as [R]
        if grep -q '\[R\]' "$TASK_FILE" 2>/dev/null; then
            success "Build agent marked task $TASK ready for review."
            # Update phase to review
            cat > tasks/current-task.md << EOF
# Current Task

This file is updated by the orchestrator loop to point to the active task.

**Task:** $TASK
**File:** $TASK_FILE
**Phase:** review
**Attempts:** $ATTEMPTS
EOF
        else
            warn "Build agent did not mark task as ready for review. Retrying..."
            # Increment attempts
            cat > tasks/current-task.md << EOF
# Current Task

This file is updated by the orchestrator loop to point to the active task.

**Task:** $TASK
**File:** $TASK_FILE
**Phase:** build
**Attempts:** $((ATTEMPTS + 1))
EOF
        fi

    elif [ "$PHASE" = "review" ]; then
        log "Launching REVIEW agent (opus)..."

        REVIEW_LOG="tasks/logs/review-$(printf '%03d' "$TASK")-attempt-$((ATTEMPTS + 1))"
        claude -p "$(cat agents/review-prompt.md)" \
            --model opus \
            --output-format stream-json \
            --verbose \
            --allowedTools "Read,Write,Edit,Bash,Glob,Grep" \
            2>&1 | tee "${REVIEW_LOG}.jsonl" | agents/format-log.sh | tee "${REVIEW_LOG}.log" || true

        # Check what the review agent decided
        if grep -q '\[X\]' "$TASK_FILE" 2>/dev/null; then
            success "Task $TASK APPROVED!"
            # The review agent should have already updated current-task.md
            # to point to the next task. Verify.
            NEW_TASK=$(get_current_task)
            if [ "$NEW_TASK" = "$TASK" ]; then
                warn "Review agent didn't advance to next task. Advancing manually."
                NEXT_TASK=$((TASK + 1))
                NEXT_FILE="tasks/$(printf '%03d' "$NEXT_TASK")-*.md"
                NEXT_FILE=$(ls $NEXT_FILE 2>/dev/null | head -1)
                if [ -z "$NEXT_FILE" ]; then
                    success "=== ALL TASKS COMPLETE ==="
                    exit 0
                fi
                cat > tasks/current-task.md << EOF
# Current Task

This file is updated by the orchestrator loop to point to the active task.

**Task:** $NEXT_TASK
**File:** $NEXT_FILE
**Phase:** build
**Attempts:** 0
EOF
            fi
        elif grep -q '\[!\]' "$TASK_FILE" 2>/dev/null; then
            warn "Task $TASK REJECTED. Sending back to build agent."
            # The review agent should have updated current-task.md.
            # Verify attempts were incremented.
            NEW_ATTEMPTS=$(get_current_attempts)
            if [ "$NEW_ATTEMPTS" = "$ATTEMPTS" ]; then
                cat > tasks/current-task.md << EOF
# Current Task

This file is updated by the orchestrator loop to point to the active task.

**Task:** $TASK
**File:** $TASK_FILE
**Phase:** build
**Attempts:** $((ATTEMPTS + 1))
EOF
            fi
        else
            warn "Review agent did not clearly approve or reject. Retrying review..."
        fi

    else
        error "Unknown phase: $PHASE"
        exit 1
    fi

    log ""
done
