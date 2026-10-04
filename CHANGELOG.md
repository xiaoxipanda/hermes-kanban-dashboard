# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Create native Hermes boards from the workspace sidebar, with immutable-slug,
  preset icons and absolute-workdir validation, then open the new board
  immediately. Selected icons appear in navigation and overview.
- Collaboration form with per-worker assignments, deliverables, acceptance
  criteria, independent review guidance and a live dependency preview.
- Reopenable collaboration progress from the board and task drawer, including
  blocked tasks, explicit verification status and the final handoff summary.
- Isolated native CLI integration coverage for dependencies and idempotency.

### Fixed
- Use native Swarm flags (`--worker`, `--verifier`, `--synthesizer`, `--json`)
  and an idempotency key; send the complete brief to every task.
- Do not treat an immediately completed Swarm root as a completed collaboration.
- Display task results and latest run summaries in the task drawer.
- Pass the block reason as the native positional argument.

### Removed
- Two-board comparison controls and their state, styles, and help text.
  Navigation now focuses on the all-board overview and single-board workspace.

## [0.5.0] - 2026-10-04

### Added
- Searchable workspace navigation with favorites, archived-board access,
  a summary overview, and an optional two-board comparison.
- Per-board filter and scroll memory, removable filter chips, status shortcuts,
  loading/empty/error states, and retry feedback.
- Right-side task drawer with keyboard-operable cards, per-task action drafts,
  and an explicit update notice while reading.
- Responsive mobile navigation and optional activity panel; neutral light/dark
  themes, consistent icons, visible focus states, and reduced-motion support.
- SSE regression tests and an optional synthetic 16-board Playwright suite.

### Changed
- Poll only the selected board(s), or just the catalog in overview mode.
  Gateway log streaming is enabled only while the activity panel is open.
- Run SSE CLI reads off the event loop and refresh the board catalog every
  15 seconds (or the configured poll interval, if longer).

### Fixed
- Keep archived tasks included during live updates; detect title/body changes
  even when task status is unchanged.
- Prevent duplicate submissions and stale task-detail responses.
- Allow closing an empty creation form and reset scroll when switching detail
  tabs; keep loaded tasks visible when a refresh fails.

## [0.4.0] - 2026-10-04

Open-source preview release.

### Added
- `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`.
- `.gitignore`, `.env.example`, `requirements.txt`.
- `install.sh` that detects a usable `python3`, creates `.venv`, installs
  dependencies, and renders `examples/com.hermes-dashboard.plist.tmpl` into a
  user-scoped launchd agent (`~/Library/LaunchAgents/`) with current user,
  paths, and env values substituted.
- `Dockerfile` + `docker-compose.yml` for container deployment (mounts a
  Hermes home read-only by default).
- GitHub Actions CI: Python syntax check (`compileall`), Node-based JS syntax
  check (`node --check`), HTML/JSON validation on PRs.
- Issue templates (`bug_report.md`, `feature_request.md`) and
  `PULL_REQUEST_TEMPLATE.md`.
- Bilingual `README.md` (zh + en) with environment variable table, API table,
  install matrix, screenshots section, and badges.
- `docs/DEPLOY.md` with Tailscale / reverse proxy / Docker guides.

### Changed
- `launch.sh` no longer assumes a fixed `python-3.14.7` interpreter: it probes
  `.venv/bin/python`, falls back to `python3` on `PATH`, and prints clear
  errors if neither is usable.
- `com.ethan.hermes-dashboard.plist` moved to
  `examples/com.hermes-dashboard.plist.tmpl` with `${USER}` / `${INSTALL_DIR}`
  / `${HERMES_HOME}` / `${HERMES_BIN}` placeholders.
- `server.py` version bump to `0.4.0`.

### Removed
- Host-specific hard-coded paths (`/Users/ethan/...`) from distributed files;
  they now live only in the user's rendered agent file after `install.sh`.

## [0.3.0] - 2026-10-04

### Added
- Visual facelift: Aurora gradient background, glassmorphism top bar, flash
  animation on status transitions.
- Light / dark theme toggle persisted in `localStorage`.
- English / Chinese UI toggle (`window.I18N`), including help overlay.
- Custom tooltip (`data-tip`) on 22+ controls explaining the underlying
  `hermes kanban` CLI command.
- Relative-time rendering with absolute-time tooltip.

### Fixed
- Unix epoch second / millisecond auto-detection in `fmt()`; previously some
  cards showed 1970 timestamps.

## [0.2.0] - 2026-10-04

### Added
- Full `hermes kanban create` form (15+ fields) and `hermes kanban swarm`
  wizard in the top bar.
- Dynamic board / assignee discovery via `hermes kanban boards list --json` /
  `hermes kanban assignees --json`; nothing hard-coded.
- Env-driven config: `HERMES_BIN`, `HERMES_HOME`, `DASHBOARD_HOST`,
  `DASHBOARD_PORT`, `DASHBOARD_TOKEN`, `DASHBOARD_POLL`.
- Optional bearer-token auth on every `/api/*` endpoint.
- Drawer tabs: Overview (Markdown body), Comments, Lifecycle events, Task
  log tail (`~/.hermes/kanban/logs/<id>.log`), Actions.
- Write actions: `block` (new), `unblock`, `request-review` (with
  `--reviewer`), `archive`, `reassign` with `--reclaim`.
- Top-bar search + status + assignee filters + archived toggle.

## [0.1.0] - 2026-10-04

Initial internal release.

### Added
- FastAPI + SSE backend, single-page vanilla JS frontend.
- Read-only view of all live boards, 2-second SSE snapshot diffing.
- Comment / unblock / request-review / archive / reassign write operations
  via `hermes kanban` subprocess (no direct SQLite access).
- launchd user-agent plist for macOS auto-start.
