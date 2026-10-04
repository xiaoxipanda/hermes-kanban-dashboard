# Hermes Kanban Dashboard

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-informational.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![Platform: macOS · Linux · Docker](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Docker-lightgrey.svg)](docs/DEPLOY.md)

A lightweight, generic, real-time dashboard on top of the **Hermes** kanban CLI.
No direct SQLite access, no hard-coded boards or assignees — every read and
write goes through `hermes kanban … --json` as a subprocess. Drop it on any
host that already has Hermes installed.

[中文说明](#中文) · [English](#english) · [Deployment](docs/DEPLOY.md) ·
[Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) ·
[Security](SECURITY.md)

---

## English

### What it does

- **Multi-board live view.** Discovers all unarchived boards at startup
  (`hermes kanban boards list --json`) and renders them side by side.
- **Status columns + flash animation.** Cards grouped by
  `running / ready / review / blocked / todo / scheduled / triage / done /
  archived`. Cards flash when their status changes.
- **Instant filtering.** Fuzzy search on `id / title / body / assignee`,
  plus status and assignee drop-downs and an "include archived" toggle.
- **Rich drawer.** Markdown-rendered body, latest 30 comments, 50 lifecycle
  events, and a tail of the worker log at `~/.hermes/kanban/logs/<id>.log`.
- **Full write surface.** `comment`, `block`, `unblock`, `request-review`
  (with `--reviewer`), `archive`, `reassign` (with `--reclaim`), plus a
  dedicated form for `kanban create` (15+ fields) and `kanban swarm`
  (parallel workers + verifier + synthesizer).
- **SSE live stream.** Every 2 s (`DASHBOARD_POLL`) the server diffs board
  snapshots and streams incremental task updates plus a live tail of
  `~/.hermes/logs/gateway.log`.
- **Aurora UI.** Glassmorphism top bar, light / dark theme, English /
  中文 toggle, custom tooltips on every control explaining the underlying
  `hermes kanban` command.
- **Zero coupling.** Does not modify Hermes core, does not touch
  `kanban.db`, does not persist its own state.

### Requirements

- Hermes with the `kanban` subcommand (recent build; the dashboard uses
  `boards list --json`, `assignees --json`, and `list --json`).
- Python **3.10+**.
- A browser (Chrome / Edge / Firefox / Safari modern enough for `<dialog>`
  and ES2020).

### Quick start

```sh
git clone https://github.com/OWNER/REPO.git hermes-kanban-dashboard
cd hermes-kanban-dashboard

# Create .venv and install dependencies (and optionally the launchd agent).
./install.sh              # just install deps
./install.sh --launchd    # macOS: also drop a user launchd agent

# Or run it manually:
./launch.sh
```

Open <http://127.0.0.1:8788>.

### Configuration

All settings are environment variables; see [`.env.example`](.env.example):

| Variable | Default | Purpose |
|---|---|---|
| `HERMES_BIN` | `$HOME/.hermes/hermes-agent/.hermes/bin/hermes` | path to the `hermes` binary |
| `HERMES_HOME` | `$HOME/.hermes` | hermes data directory (holds `kanban.db`, `logs/`, `kanban/logs/`) |
| `DASHBOARD_HOST` | `127.0.0.1` | bind host |
| `DASHBOARD_PORT` | `8788` | bind port |
| `DASHBOARD_TOKEN` | *(unset)* | if set, every `/api/*` request (incl. SSE) must send `Authorization: Bearer <token>` or `?token=…` |
| `DASHBOARD_POLL` | `2.0` | SSE poll interval in seconds |

### HTTP API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/healthz` | liveness, no auth required |
| `GET` | `/api/config` | boards + assignees + poll config |
| `GET` | `/api/boards` | unarchived board list |
| `GET` | `/api/assignees` | assignee list |
| `GET` | `/api/boards/{board}/tasks?include_archived=0` | task list, newest-updated first |
| `GET` | `/api/tasks/{board}/{id}` | task + comments + events + runs |
| `GET` | `/api/tasks/{board}/{id}/log?lines=400` | tail worker log |
| `GET` | `/api/events?boards=a,b` | SSE live stream |
| `POST` | `/api/tasks/{board}/{id}/comment` | `{text}` |
| `POST` | `/api/tasks/{board}/{id}/block` | `{reason?}` |
| `POST` | `/api/tasks/{board}/{id}/unblock` | `{reason?}` |
| `POST` | `/api/tasks/{board}/{id}/request-review` | `{summary?, reviewer?}` |
| `POST` | `/api/tasks/{board}/{id}/archive` | `{reason?}` |
| `POST` | `/api/tasks/{board}/{id}/reassign` | `{assignee, reclaim?, reason?}` |
| `POST` | `/api/boards/{board}/create` | full `kanban create` payload |
| `POST` | `/api/boards/{board}/swarm` | parallel workers + verifier + synthesizer |

### Development

```sh
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python server.py                      # auto-reload with uvicorn --reload if you prefer
```

CI runs `python -m compileall server.py`, `node --check static/app.js`,
`node --check static/i18n.js`, and `docker build`.
See [CONTRIBUTING.md](CONTRIBUTING.md) for scope and PR expectations.

### Deployment

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for macOS launchd, Linux systemd,
Docker, Tailscale, and reverse-proxy recipes.

### Screenshots

> Add `docs/dashboard-dark.png` / `docs/dashboard-light.png` to replace this
> placeholder.

| Dark | Light |
|---|---|
| *(screenshot)* | *(screenshot)* |

### License

MIT — see [LICENSE](LICENSE).

---

## 中文

### 简介

一个独立的 **Hermes** 看板实时 Dashboard。所有读写都走
`hermes kanban … --json` 子进程,不直接读写 SQLite,不改 Hermes 核心,
不硬编码任何看板名、assignee 或工作流。可部署在任何装了 Hermes 的机器上,
启动时从 CLI 动态发现看板列表。

### 主要功能

- **多看板实时视图**:自动发现当前机器所有未归档看板,一行横向展示。
- **状态分组 + 变更闪烁**:按 `running / ready / review / blocked / todo /
  scheduled / triage / done / archived` 分列,状态变化时卡片闪烁。
- **即时过滤**:关键词(id/title/body/assignee)+ 状态 + assignee 下拉
  + 含归档开关。
- **抽屉详情**:Markdown 渲染 body、最近 30 条评论、50 条生命周期事件、
  以及 `~/.hermes/kanban/logs/<id>.log` 的实时 tail。
- **全套写操作**:`comment` / `block` / `unblock` / `request-review` /
  `archive` / `reassign`,外加顶栏的"新建任务"(15+ 参数) 和 "Swarm"
  (并行 worker + verifier + synthesizer)弹窗。
- **SSE 实时流**:每 2s (`DASHBOARD_POLL`) 对各看板做签名比对增量推送,
  同时 tail `~/.hermes/logs/gateway.log`。
- **外观与多语**:Aurora 玻璃顶栏、深浅主题切换、中英双语、每个控件都
  带 tooltip 说明对应的 `hermes kanban` 命令。
- **零耦合**:不修改 Hermes 核心,不碰 `kanban.db`,自身无状态。

### 环境需求

- 装了 Hermes 且带 `kanban` 子命令的机器(需要支持 `boards list --json` /
  `assignees --json` / `list --json`)。
- Python **3.10 或更高**。
- 现代浏览器(支持 `<dialog>` 与 ES2020,Chrome / Edge / Firefox / Safari
  都可)。

### 快速开始

```sh
git clone https://github.com/OWNER/REPO.git hermes-kanban-dashboard
cd hermes-kanban-dashboard

# 创建 .venv 并安装依赖(可选同时注册 launchd 自启动)
./install.sh              # 只装依赖
./install.sh --launchd    # macOS: 另外写一份用户级 launchd agent

# 或者手动前台跑:
./launch.sh
```

访问 <http://127.0.0.1:8788>。

### 配置

所有配置都是环境变量,见 [`.env.example`](.env.example):

| 变量 | 默认 | 作用 |
|---|---|---|
| `HERMES_BIN` | `$HOME/.hermes/hermes-agent/.hermes/bin/hermes` | hermes 可执行路径 |
| `HERMES_HOME` | `$HOME/.hermes` | hermes 数据目录 |
| `DASHBOARD_HOST` | `127.0.0.1` | 绑定地址 |
| `DASHBOARD_PORT` | `8788` | 绑定端口 |
| `DASHBOARD_TOKEN` | *(未设)* | 设置后所有 `/api/*`(含 SSE)需带 token |
| `DASHBOARD_POLL` | `2.0` | SSE 轮询间隔(秒) |

### 部署

参见 **[docs/DEPLOY.md](docs/DEPLOY.md)**,涵盖 macOS launchd、Linux
systemd、Docker、Tailscale、反向代理等场景。

### 开源协议

MIT,见 [LICENSE](LICENSE)。
