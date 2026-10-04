#!/usr/bin/env bash
# Hermes Kanban Dashboard — one-shot installer.
#
# What it does:
#   1. Finds a Python interpreter (>=3.10) — prefer $PYTHON, then python3.
#   2. Creates .venv/ and installs requirements.txt into it.
#   3. (macOS only, if --launchd) renders examples/com.hermes-dashboard.plist.tmpl
#      with the current user / paths, drops it under ~/Library/LaunchAgents/,
#      and `launchctl load`s it.
#
# Usage:
#   ./install.sh                 # just create .venv + install deps
#   ./install.sh --launchd       # also install macOS launchd user agent
#   ./install.sh --dry-run       # print what would happen
#
# The script never writes outside this project directory and
# ~/Library/LaunchAgents (and only when you pass --launchd).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

LAUNCHD=0
DRY=0
for arg in "$@"; do
  case "$arg" in
    --launchd) LAUNCHD=1 ;;
    --dry-run) DRY=1 ;;
    -h|--help)
      sed -n '2,25p' "$0"; exit 0 ;;
    *)
      echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

say() { printf '\033[1;36m[install]\033[0m %s\n' "$*"; }
run() { if [[ "$DRY" == "1" ]]; then printf '  (dry) %s\n' "$*"; else eval "$@"; fi; }

# ── 1. python
pick_python() {
  if [[ -n "${PYTHON:-}" && -x "$PYTHON" ]]; then
    printf '%s' "$PYTHON"; return
  fi
  for cand in python3 python3.13 python3.12 python3.11 python3.10; do
    if command -v "$cand" >/dev/null 2>&1; then
      command -v "$cand"; return
    fi
  done
  echo ""
}

PY="$(pick_python)"
if [[ -z "$PY" ]]; then
  echo "error: no python3 found (need >=3.10). Install one and re-run." >&2
  exit 1
fi

PY_VER="$("$PY" -c 'import sys; print("{}.{}".format(*sys.version_info[:2]))')"
say "using Python $PY_VER at $PY"

PY_OK="$("$PY" -c 'import sys; print(1 if sys.version_info>=(3,10) else 0)')"
if [[ "$PY_OK" != "1" ]]; then
  echo "error: Python $PY_VER too old, need >=3.10" >&2
  exit 1
fi

# ── 2. venv + deps
if [[ ! -d "$ROOT/.venv" ]]; then
  say "creating .venv/"
  run "$PY -m venv \"$ROOT/.venv\""
fi
say "installing requirements.txt"
run "$ROOT/.venv/bin/pip install --quiet --upgrade pip"
run "$ROOT/.venv/bin/pip install --quiet -r \"$ROOT/requirements.txt\""

chmod +x "$ROOT/launch.sh" || true

# ── 3. macOS launchd
if [[ "$LAUNCHD" == "1" ]]; then
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "error: --launchd only works on macOS" >&2
    exit 1
  fi

  TMPL="$ROOT/examples/com.hermes-dashboard.plist.tmpl"
  [[ -f "$TMPL" ]] || { echo "error: $TMPL missing"; exit 1; }

  LAUNCH_DIR="$HOME/Library/LaunchAgents"
  TARGET="$LAUNCH_DIR/com.${USER}.hermes-dashboard.plist"
  mkdir -p "$LAUNCH_DIR"

  : "${HERMES_HOME:=$HOME/.hermes}"
  : "${HERMES_BIN:=$HERMES_HOME/hermes-agent/.hermes/bin/hermes}"
  : "${DASHBOARD_HOST:=127.0.0.1}"
  : "${DASHBOARD_PORT:=8788}"

  LABEL="com.${USER}.hermes-dashboard"
  say "rendering $TARGET"
  if [[ "$DRY" == "1" ]]; then
    printf '  (dry) sed template -> %s\n' "$TARGET"
  else
    sed \
      -e "s|@@LABEL@@|$LABEL|g" \
      -e "s|@@INSTALL_DIR@@|$ROOT|g" \
      -e "s|@@HOME@@|$HOME|g" \
      -e "s|@@HERMES_BIN@@|$HERMES_BIN|g" \
      -e "s|@@HERMES_HOME@@|$HERMES_HOME|g" \
      -e "s|@@DASHBOARD_HOST@@|$DASHBOARD_HOST|g" \
      -e "s|@@DASHBOARD_PORT@@|$DASHBOARD_PORT|g" \
      "$TMPL" > "$TARGET"
  fi

  say "loading launchd agent"
  run "launchctl unload \"$TARGET\" 2>/dev/null || true"
  run "launchctl load -w \"$TARGET\""
  say "launchd agent installed as $LABEL"
  say "logs: $HERMES_HOME/logs/dashboard.{out,err}.log"
fi

say "done."
say "start the dashboard with:   ./launch.sh"
say "or visit:                   http://${DASHBOARD_HOST:-127.0.0.1}:${DASHBOARD_PORT:-8788}"
