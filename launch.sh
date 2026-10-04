#!/usr/bin/env bash
# Hermes Kanban Dashboard — portable launcher.
#
# Picks a Python interpreter in this order:
#   1. $PYTHON if set and executable
#   2. $ROOT/.venv/bin/python  (recommended; see install.sh)
#   3. python3 on PATH
#
# All DASHBOARD_* / HERMES_* env vars have sensible defaults; see .env.example.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

export HERMES_BIN="${HERMES_BIN:-$HOME/.hermes/hermes-agent/.hermes/bin/hermes}"
export HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
export DASHBOARD_HOST="${DASHBOARD_HOST:-127.0.0.1}"
export DASHBOARD_PORT="${DASHBOARD_PORT:-8788}"
export DASHBOARD_POLL="${DASHBOARD_POLL:-2.0}"

# Optional: source .env for local overrides (never committed).
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env"
  set +a
fi

choose_python() {
  if [[ -n "${PYTHON:-}" && -x "${PYTHON}" ]]; then
    printf '%s' "$PYTHON"; return
  fi
  if [[ -x "$ROOT/.venv/bin/python" ]]; then
    printf '%s' "$ROOT/.venv/bin/python"; return
  fi
  if command -v python3 >/dev/null 2>&1; then
    command -v python3; return
  fi
  echo "error: no python3 interpreter found. Run ./install.sh or set PYTHON=..." >&2
  exit 127
}

PY="$(choose_python)"

exec "$PY" -m uvicorn server:app \
  --host "$DASHBOARD_HOST" \
  --port "$DASHBOARD_PORT" \
  --log-level info
