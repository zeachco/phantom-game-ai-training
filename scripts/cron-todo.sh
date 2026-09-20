#!/usr/bin/env bash
set -Eeuo pipefail

# Run this script from cron to let a coding agent complete one TODO item.
# The working tree must be clean so the agent cannot overwrite local work.

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd -- "$ROOT_DIR"

TODO_DIR=${TODO_DIR:-"$ROOT_DIR/todos"}
BUGS_FILE="$TODO_DIR/bugs.md"
FEATURES_FILE="$TODO_DIR/features.md"
VERIFY_COMMAND=${VERIFY_COMMAND:-"npm run ci"}
COMMIT_MESSAGE=${COMMIT_MESSAGE:-"auto: complete todo task"}
LOCK_FILE=${CRON_TODO_LOCK_FILE:-"$ROOT_DIR/.git/cron-todo.lock"}
PI_BIN=${PI_BIN:-pi}
PI_THINKING=${PI_THINKING:-low}

log() {
  printf '[cron-todo] %s\n' "$*"
}

fail() {
  printf '[cron-todo] ERROR: %s\n' "$*" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail "git is required"
command -v flock >/dev/null 2>&1 || fail "flock is required"
command -v "$PI_BIN" >/dev/null 2>&1 || fail "coding agent not found: $PI_BIN (set PI_BIN or PATH in cron)"

[[ -d "$TODO_DIR" ]] || fail "TODO directory not found: $TODO_DIR"
[[ -f "$BUGS_FILE" ]] || fail "bugs file not found: $BUGS_FILE"
[[ -f "$FEATURES_FILE" ]] || fail "features file not found: $FEATURES_FILE"

# A non-blocking lock prevents two cron invocations from editing and pushing at once.
mkdir -p -- "$(dirname -- "$LOCK_FILE")"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "another run is already active; exiting"
  exit 0
fi

if [[ -n "$(git status --porcelain)" ]]; then
  fail "working tree is not clean; refusing to pull or modify local work"
fi

BRANCH=$(git symbolic-ref --quiet --short HEAD) || fail "repository is in detached HEAD state"
log "pulling latest changes on $BRANCH"
git pull --ff-only
BASE_COMMIT=$(git rev-parse HEAD)

PROMPT=$(cat <<EOF
Work on exactly one task in this repository.

1. Read $BUGS_FILE first, then $FEATURES_FILE.
2. Find unfinished tasks. Bugs have priority over features. Within the highest-priority non-empty group, choose the easiest task to complete safely and completely (use your judgment; do not just pick the first line).
3. Implement only that one task. Do not start another task or make unrelated refactors.
4. Update the task list to mark the selected task complete. Preserve the existing task-list style.
5. Run the project's relevant validation, including the normal CI/build command if practical.
6. Do not commit, push, reset, or discard changes; this script owns git commit and push.

If there are no unfinished tasks, make no changes and report that clearly.
EOF
)

AGENT_LOG=$(mktemp)
trap 'rm -f -- "$AGENT_LOG"' EXIT

log "asking the coding agent to complete one task"
PI_ARGS=(--print --no-session --approve --thinking "$PI_THINKING")
if [[ -n "${PI_PROVIDER:-}" ]]; then
  PI_ARGS+=(--provider "$PI_PROVIDER")
fi
if [[ -n "${PI_MODEL:-}" ]]; then
  PI_ARGS+=(--model "$PI_MODEL")
fi

if ! "$PI_BIN" "${PI_ARGS[@]}" "$PROMPT" 2>&1 | tee "$AGENT_LOG"; then
  fail "coding agent failed; nothing was committed or pushed"
fi

if [[ "$(git rev-parse HEAD)" != "$BASE_COMMIT" ]]; then
  fail "coding agent committed changes; it must leave commit and push to this script"
fi

if [[ -z "$(git status --porcelain)" ]]; then
  log "no changes made; there was no unfinished task"
  exit 0
fi

if ! git diff --name-only HEAD -- | grep -Fxq -- "${BUGS_FILE#"$ROOT_DIR/"}" && \
   ! git diff --name-only HEAD -- | grep -Fxq -- "${FEATURES_FILE#"$ROOT_DIR/"}"; then
  fail "agent changed files but did not update the selected task list"
fi

log "checking for whitespace errors"
git diff --check HEAD

if [[ -n "$VERIFY_COMMAND" ]]; then
  log "running validation: $VERIFY_COMMAND"
  bash -c "$VERIFY_COMMAND"
fi

log "committing changes"
git add -A
git commit -m "$COMMIT_MESSAGE"

log "pushing $BRANCH"
git push
log "done"
