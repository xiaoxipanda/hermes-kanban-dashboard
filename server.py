"""Hermes Kanban live Dashboard — generic, token-optional.

Everything is driven through `hermes kanban` subprocess + `hermes kanban …
--json`. No direct SQLite writes, no hard-coded boards or assignees.

Configuration env vars (all optional):
  HERMES_BIN       path to hermes binary (default: $HOME/.hermes/hermes-agent/.hermes/bin/hermes)
  HERMES_HOME      hermes home dir (default: $HOME/.hermes)
  DASHBOARD_HOST   bind host (default: 127.0.0.1)
  DASHBOARD_PORT   bind port (default: 8788)
  DASHBOARD_TOKEN  if set, every /api/* request must present ?token=…
                   or Authorization: Bearer <token>
  DASHBOARD_POLL   SSE poll interval seconds (default: 2.0)
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import shlex
import subprocess
import threading
import time
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

HERMES_BIN = os.environ.get(
    "HERMES_BIN",
    str(Path.home() / ".hermes" / "hermes-agent" / ".hermes" / "bin" / "hermes"),
)
HERMES_HOME = Path(os.environ.get("HERMES_HOME", str(Path.home() / ".hermes")))
GATEWAY_LOG = HERMES_HOME / "logs" / "gateway.log"
TASK_LOG_DIR = HERMES_HOME / "kanban" / "logs"
TOKEN = os.environ.get("DASHBOARD_TOKEN")
POLL_SECONDS = float(os.environ.get("DASHBOARD_POLL", "2.0"))
BOARD_CREATE_LOCK = threading.Lock()
BOARD_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
BOARD_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

APP_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Hermes Kanban Dashboard", version="0.5.0")
app.mount("/static", StaticFiles(directory=str(APP_DIR / "static")), name="static")


def require_token(request: Request, token: str | None = Query(default=None)) -> None:
    if not TOKEN:
        return
    hdr = request.headers.get("authorization", "")
    bearer = hdr.removeprefix("Bearer ").strip() if hdr.lower().startswith("bearer ") else None
    presented = token or bearer or request.query_params.get("token")
    if presented != TOKEN:
        raise HTTPException(401, "token required")


def _run_hermes(args: list[str], timeout: int = 25, stdin_data: str | None = None) -> tuple[int, str, str]:
    cmd = [HERMES_BIN, "kanban", *args]
    try:
        proc = subprocess.run(
            cmd,
            input=stdin_data,
            capture_output=True,
            text=True,
            timeout=timeout,
            env={**os.environ, "HERMES_HOME": str(HERMES_HOME)},
        )
    except subprocess.TimeoutExpired as exc:
        return 124, "", f"timeout after {timeout}s: {shlex.join(cmd)}: {exc}"
    return proc.returncode, proc.stdout, proc.stderr


def _hermes_json(args: list[str]) -> Any:
    rc, out, err = _run_hermes(args)
    if rc != 0:
        raise HTTPException(500, detail={"cmd": args, "rc": rc, "stderr": err[-800:]})
    try:
        return json.loads(out)
    except json.JSONDecodeError as exc:
        raise HTTPException(500, detail={"cmd": args, "parse_error": str(exc), "head": out[:400]})


def _list_boards() -> list[dict]:
    return _hermes_json(["boards", "list", "--all", "--json"])


def _board_slugs() -> list[str]:
    return [b["slug"] for b in _list_boards()]


def _ensure_board(board: str) -> None:
    if board not in _board_slugs():
        raise HTTPException(404, f"unknown board {board}")


# ─── read endpoints ────────────────────────────────────────────────────────────


@app.get("/")
def index() -> FileResponse:
    return FileResponse(
        APP_DIR / "templates" / "index.html",
        headers={
            "Cache-Control": "no-store, max-age=0",
            "Pragma": "no-cache",
        },
    )


@app.get("/healthz")
def healthz() -> dict:
    return {
        "ok": True,
        "hermes_bin": HERMES_BIN,
        "hermes_home": str(HERMES_HOME),
        "auth": bool(TOKEN),
        "poll_seconds": POLL_SECONDS,
    }


@app.get("/api/config", dependencies=[Depends(require_token)])
def api_config() -> dict:
    return {
        "boards": _list_boards(),
        "assignees": _hermes_json(["assignees", "--json"]),
        "poll_seconds": POLL_SECONDS,
        "has_task_logs": TASK_LOG_DIR.is_dir(),
    }


@app.get("/api/boards", dependencies=[Depends(require_token)])
def boards() -> dict:
    return {"boards": _list_boards()}


@app.get("/api/assignees", dependencies=[Depends(require_token)])
def assignees() -> dict:
    return {"assignees": _hermes_json(["assignees", "--json"])}


@app.get("/api/boards/{board}/tasks", dependencies=[Depends(require_token)])
def list_tasks(board: str, include_archived: bool = False) -> dict:
    _ensure_board(board)
    args = ["--board", board, "list", "--json", "--sort", "updated"]
    if include_archived:
        args.append("--archived")
    tasks = _hermes_json(args)
    return {"board": board, "tasks": tasks, "fetched_at": time.time()}


@app.get("/api/tasks/{board}/{task_id}", dependencies=[Depends(require_token)])
def show_task(board: str, task_id: str) -> dict:
    _ensure_board(board)
    data = _hermes_json(["--board", board, "show", task_id, "--json"])
    return {"board": board, **data}


@app.get("/api/tasks/{board}/{task_id}/log", dependencies=[Depends(require_token)])
def task_log(board: str, task_id: str, lines: int = 400) -> dict:
    _ensure_board(board)
    log_path = TASK_LOG_DIR / f"{task_id}.log"
    if not log_path.exists():
        return {"board": board, "task_id": task_id, "exists": False, "lines": []}
    try:
        text = log_path.read_text(errors="replace").splitlines()
    except OSError as exc:
        raise HTTPException(500, f"read {log_path}: {exc}")
    return {
        "board": board,
        "task_id": task_id,
        "exists": True,
        "size": log_path.stat().st_size,
        "lines": text[-lines:],
    }


# ─── write ops ─────────────────────────────────────────────────────────────────


class CommentPayload(BaseModel):
    text: str = Field(min_length=1, max_length=16000)


class ReasonPayload(BaseModel):
    reason: str | None = None


class ReviewPayload(BaseModel):
    summary: str | None = None
    reviewer: str | None = None


class ReassignPayload(BaseModel):
    assignee: str = Field(min_length=1, max_length=64)
    reclaim: bool = False
    reason: str | None = None


class CreatePayload(BaseModel):
    title: str = Field(min_length=1, max_length=400)
    body: str | None = None
    assignee: str | None = None
    priority: int | None = None
    tenant: str | None = None
    project: str | None = None
    workspace: str | None = None
    branch: str | None = None
    max_runtime: str | None = None
    max_retries: int | None = None
    model: str | None = None
    provider: str | None = None
    skills: list[str] | None = None
    parents: list[str] | None = None
    triage: bool = False
    initial_status: str | None = None  # "blocked" | "running" | None
    idempotency_key: str | None = None


class SwarmWorkerPayload(BaseModel):
    profile: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=400)


class SwarmPayload(BaseModel):
    title: str = Field(min_length=1, max_length=400)
    body: str = Field(default="", max_length=8000)
    deliverable: str = Field(min_length=1, max_length=4000)
    acceptance: str = Field(min_length=1, max_length=4000)
    workers: list[SwarmWorkerPayload] = Field(min_length=1, max_length=16)
    verifier_assignee: str = Field(min_length=1, max_length=64)
    synth_assignee: str = Field(min_length=1, max_length=64)
    tenant: str | None = Field(default=None, max_length=128)
    priority: int = Field(default=0, ge=0, le=100)
    idempotency_key: str = Field(min_length=1, max_length=128)


class BoardCreatePayload(BaseModel):
    slug: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    icon: str | None = Field(default=None, max_length=16)
    color: str | None = Field(default=None, max_length=7)
    default_workdir: str | None = Field(default=None, max_length=1024)


def _ok(args: list[str], stdin_data: str | None = None) -> dict:
    rc, out, err = _run_hermes(args, stdin_data=stdin_data)
    if rc != 0:
        raise HTTPException(400, detail={"cmd": args, "rc": rc, "stderr": err[-800:], "stdout": out[-400:]})
    return {"ok": True, "stdout": out[-1600:], "stderr": err[-400:]}


@app.post("/api/boards", dependencies=[Depends(require_token)], status_code=201)
def act_create_board(payload: BoardCreatePayload) -> dict:
    slug = payload.slug.strip()
    name = payload.name.strip()
    description = (payload.description or "").strip()
    icon = (payload.icon or "").strip()
    color = (payload.color or "").strip()
    default_workdir = (payload.default_workdir or "").strip()
    if not BOARD_SLUG_RE.fullmatch(slug):
        raise HTTPException(422, "slug must be 1-64 lowercase letters, numbers, hyphens or underscores")
    if not name:
        raise HTTPException(422, "display name is required")
    if color and not BOARD_COLOR_RE.fullmatch(color):
        raise HTTPException(422, "color must be a six-digit hex value")
    if default_workdir and not Path(default_workdir).expanduser().is_absolute():
        raise HTTPException(422, "default work directory must be an absolute path")

    # The native command updates an existing board, so serialize the existence
    # check with creation and fail instead of silently overwriting metadata.
    with BOARD_CREATE_LOCK:
        if slug in _board_slugs():
            raise HTTPException(409, f"board {slug!r} already exists")
        args = ["boards", "create", slug, "--name", name]
        if description:
            args.extend(["--description", description])
        if icon:
            args.extend(["--icon", icon])
        if color:
            args.extend(["--color", color])
        if default_workdir:
            args.extend(["--default-workdir", default_workdir])
        rc, out, err = _run_hermes(args)
        if rc != 0:
            raise HTTPException(400, detail={"rc": rc, "stderr": err[-1200:]})
        board = next((b for b in _list_boards() if b["slug"] == slug), None)
        if board is None:
            raise HTTPException(502, "Hermes reported success but the new board was not discoverable")
    return {"ok": True, "board": board}


@app.post("/api/tasks/{board}/{task_id}/comment", dependencies=[Depends(require_token)])
def act_comment(board: str, task_id: str, payload: CommentPayload) -> dict:
    _ensure_board(board)
    return _ok(["--board", board, "comment", task_id, payload.text])


@app.post("/api/tasks/{board}/{task_id}/unblock", dependencies=[Depends(require_token)])
def act_unblock(board: str, task_id: str, payload: ReasonPayload) -> dict:
    _ensure_board(board)
    args = ["--board", board, "unblock", task_id]
    if payload.reason:
        args.extend(["--reason", payload.reason])
    return _ok(args)


@app.post("/api/tasks/{board}/{task_id}/block", dependencies=[Depends(require_token)])
def act_block(board: str, task_id: str, payload: ReasonPayload) -> dict:
    _ensure_board(board)
    args = ["--board", board, "block", task_id]
    if payload.reason:
        args.extend(["--", payload.reason])
    return _ok(args)


@app.post("/api/tasks/{board}/{task_id}/request-review", dependencies=[Depends(require_token)])
def act_request_review(board: str, task_id: str, payload: ReviewPayload) -> dict:
    _ensure_board(board)
    args = ["--board", board, "request-review", task_id]
    if payload.summary:
        args.extend(["--summary", payload.summary])
    if payload.reviewer:
        args.extend(["--reviewer", payload.reviewer])
    return _ok(args)


@app.post("/api/tasks/{board}/{task_id}/archive", dependencies=[Depends(require_token)])
def act_archive(board: str, task_id: str, payload: ReasonPayload) -> dict:
    _ensure_board(board)
    if payload.reason:
        rc, _, err = _run_hermes(["--board", board, "comment", task_id, f"[archive] {payload.reason}"])
        if rc != 0:
            raise HTTPException(400, detail={"stage": "pre-comment", "stderr": err[-400:]})
    return _ok(["--board", board, "archive", task_id])


@app.post("/api/tasks/{board}/{task_id}/reassign", dependencies=[Depends(require_token)])
def act_reassign(board: str, task_id: str, payload: ReassignPayload) -> dict:
    _ensure_board(board)
    args = ["--board", board, "reassign", task_id, payload.assignee]
    if payload.reclaim:
        args.append("--reclaim")
    if payload.reason:
        args.extend(["--reason", payload.reason])
    return _ok(args)


@app.post("/api/boards/{board}/create", dependencies=[Depends(require_token)])
def act_create(board: str, payload: CreatePayload) -> dict:
    _ensure_board(board)
    args: list[str] = ["--board", board, "create", "--json"]
    if payload.body is not None:
        args.extend(["--body-file", "-"])
    if payload.assignee:
        args.extend(["--assignee", payload.assignee])
    if payload.priority is not None:
        args.extend(["--priority", str(payload.priority)])
    if payload.tenant:
        args.extend(["--tenant", payload.tenant])
    if payload.project:
        args.extend(["--project", payload.project])
    if payload.workspace:
        args.extend(["--workspace", payload.workspace])
    if payload.branch:
        args.extend(["--branch", payload.branch])
    if payload.max_runtime:
        args.extend(["--max-runtime", payload.max_runtime])
    if payload.max_retries is not None:
        args.extend(["--max-retries", str(payload.max_retries)])
    if payload.model:
        args.extend(["--model", payload.model])
    if payload.provider:
        args.extend(["--provider", payload.provider])
    for s in payload.skills or []:
        args.extend(["--skill", s])
    for p in payload.parents or []:
        args.extend(["--parent", p])
    if payload.triage:
        args.append("--triage")
    if payload.initial_status:
        args.extend(["--initial-status", payload.initial_status])
    if payload.idempotency_key:
        args.extend(["--idempotency-key", payload.idempotency_key])
    args.append(payload.title)
    rc, out, err = _run_hermes(args, stdin_data=payload.body)
    if rc != 0:
        raise HTTPException(400, detail={"cmd": args, "rc": rc, "stderr": err[-800:]})
    try:
        parsed = json.loads(out) if out.strip().startswith("{") else {"raw": out.strip()}
    except json.JSONDecodeError:
        parsed = {"raw": out.strip()}
    return {"ok": True, "task": parsed}


@app.post("/api/boards/{board}/swarm", dependencies=[Depends(require_token)])
def act_swarm(board: str, payload: SwarmPayload) -> dict:
    _ensure_board(board)
    if next(b for b in _list_boards() if b["slug"] == board).get("archived"):
        raise HTTPException(400, "Cannot create in an archived board")
    profiles = {a["name"] for a in _hermes_json(["assignees", "--json"]) if a.get("on_disk", True)}
    chosen = [w.profile for w in payload.workers] + [payload.verifier_assignee, payload.synth_assignee]
    if any(p not in profiles or ":" in p for p in chosen):
        raise HTTPException(422, "Choose an available profile for every role")
    if any(not w.title.strip() or ":" in w.title for w in payload.workers):
        raise HTTPException(422, "Worker titles must be nonempty; use a full-width colon (：) instead of ':'")
    if not all(s.strip() for s in [payload.title, payload.deliverable, payload.acceptance]):
        raise HTTPException(422, "Goal, deliverable and acceptance criteria are required")
    # Native swarm accepts the complete shared brief as the positional goal.
    # One atomic native operation creates all cards and their dependencies.
    goal = (f"{payload.title.strip()}\n\n{payload.body.strip()}\n\n"
            f"## Deliverable / 交付物\n{payload.deliverable.strip()}\n\n"
            f"## Acceptance criteria / 验收标准\n{payload.acceptance.strip()}")
    args = ["--board", board, "swarm", "--json",
            "--verifier", payload.verifier_assignee,
            "--synthesizer", payload.synth_assignee,
            "--priority", str(payload.priority),
            "--idempotency-key", payload.idempotency_key]
    for worker in payload.workers:
        args.extend(["--worker", f"{worker.profile}:{worker.title.strip()}"])
    if payload.tenant:
        args.extend(["--tenant", payload.tenant])
    args.extend(["--", goal])
    rc, out, err = _run_hermes(args)
    if rc != 0:
        raise HTTPException(400, detail={"rc": rc, "stderr": err[-1200:]})
    try:
        topology = json.loads(out)
        if not topology.get("root_id"):
            raise ValueError("missing root_id")
    except (ValueError, AttributeError):
        raise HTTPException(502, "Unexpected CLI response; retry with the same idempotency key")
    return {"ok": True, "swarm": topology}


def _swarm_topology(data: dict) -> dict | None:
    topology = None
    for comment in data.get("comments", []):
        body = comment.get("body") or ""
        if not body.startswith("[swarm:blackboard] "):
            continue
        try:
            entry = json.loads(body[len("[swarm:blackboard] "):])
            value = entry.get("value")
            if entry.get("key") == "topology" and isinstance(value, dict):
                if isinstance(value.get("worker_ids"), list) and value.get("verifier_id") and value.get("synthesizer_id"):
                    topology = value
        except (ValueError, AttributeError):
            continue
    return topology


@app.get("/api/swarms/{board}/{root_id}", dependencies=[Depends(require_token)])
def show_swarm(board: str, root_id: str) -> dict:
    _ensure_board(board)
    root = _hermes_json(["--board", board, "show", root_id, "--json"])
    topology = _swarm_topology(root)
    if not topology:
        raise HTTPException(404, "This card has no Swarm topology")
    tasks = {t["id"]: t for t in _hermes_json(["--board", board, "list", "--json", "--archived"])}
    ids = topology["worker_ids"] + [topology["verifier_id"], topology["synthesizer_id"]]
    cards = [tasks.get(i, {"id": i, "status": "missing"}) for i in ids]
    for card in cards:
        if card["status"] == "blocked":
            detail = _hermes_json(["--board", board, "show", card["id"], "--json"])
            card["blocked_reason"] = card.get("last_failure_error") or ""
            for event in reversed(detail.get("events", [])):
                if event.get("kind") != "blocked":
                    continue
                value = event.get("payload") or {}
                if isinstance(value, str):
                    try:
                        value = json.loads(value)
                    except ValueError:
                        value = {}
                if isinstance(value, dict):
                    card["blocked_reason"] = value.get("reason") or card["blocked_reason"]
                break
    verifier = _hermes_json(["--board", board, "show", topology["verifier_id"], "--json"]) if topology["verifier_id"] in tasks else {}
    synthesis = _hermes_json(["--board", board, "show", topology["synthesizer_id"], "--json"]) if topology["synthesizer_id"] in tasks else {}
    gate = None
    # Use only the latest run; a previous pass must not mask a failed rerun.
    runs = verifier.get("runs") or []
    if runs:
        run = max(runs, key=lambda r: r.get("id", 0))
        metadata = run.get("metadata") or {}
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except ValueError:
                metadata = {}
        if isinstance(metadata, dict):
            gate = metadata.get("gate")
    if any(c["status"] == "missing" for c in cards):
        phase = "incomplete"
    elif any(c["status"] == "blocked" for c in cards):
        phase = "blocked"
    elif any(c["status"] == "archived" for c in cards):
        phase = "archived"
    elif any(c["status"] != "done" for c in cards[:-2]):
        phase = "workers"
    elif cards[-2]["status"] != "done":
        phase = "verifier"
    elif gate != "pass":
        phase = "unverified"
    elif cards[-1]["status"] != "done":
        phase = "synthesis"
    else:
        phase = "done"
    return {"board": board, "root": root["task"], "topology": topology,
            "cards": cards, "phase": phase, "gate": gate,
            "completed": sum(c["status"] == "done" for c in cards), "total": len(cards),
            "result": (synthesis.get("task") or {}).get("result") or synthesis.get("latest_summary") or ""}


# ─── SSE ───────────────────────────────────────────────────────────────────────


async def _event_stream(
    request: Request,
    boards_filter: list[str] | None,
    include_archived: bool = False,
    gateway: bool = True,
):
    last_snapshot: dict[str, Any] = {}
    log_pos = GATEWAY_LOG.stat().st_size if GATEWAY_LOG.exists() else 0
    available: list[str] = []
    next_catalog_refresh = 0.0

    yield f": connected at {time.time()}\n\n"
    while True:
        if await request.is_disconnected():
            break
        if time.monotonic() >= next_catalog_refresh:
            try:
                catalog = await asyncio.to_thread(_list_boards)
                available = [b["slug"] for b in catalog]
                yield f"event: boards\ndata: {json.dumps({'boards': catalog}, ensure_ascii=False)}\n\n"
            except HTTPException as exc:
                yield f"event: error\ndata: {json.dumps({'boards_error': str(exc.detail)})}\n\n"
            next_catalog_refresh = time.monotonic() + max(15.0, POLL_SECONDS)
        # None preserves the original API default; [] subscribes only to summaries.
        targets = [b for b in available if boards_filter is None or b in boards_filter]
        for board in targets:
            if await request.is_disconnected():
                return
            try:
                args = ["--board", board, "list", "--json", "--sort", "updated"]
                if include_archived:
                    args.append("--archived")
                tasks = await asyncio.to_thread(_hermes_json, args)
            except HTTPException as exc:
                yield f"event: error\ndata: {json.dumps({'board': board, 'error': str(exc.detail)}, ensure_ascii=False)}\n\n"
                continue
            sig = json.dumps(tasks, sort_keys=True, ensure_ascii=False)
            if last_snapshot.get(board) != sig:
                last_snapshot[board] = sig
                payload = {"board": board, "tasks": tasks, "ts": time.time()}
                yield f"event: tasks\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
        if gateway and GATEWAY_LOG.exists():
            size = GATEWAY_LOG.stat().st_size
            if size < log_pos:
                log_pos = 0
            if size > log_pos:
                try:
                    with GATEWAY_LOG.open("r", errors="replace") as fh:
                        fh.seek(log_pos)
                        chunk = fh.read(size - log_pos)
                        log_pos = fh.tell()
                    for line in chunk.splitlines():
                        line = line.strip()
                        if not line:
                            continue
                        yield f"event: gateway\ndata: {json.dumps({'line': line}, ensure_ascii=False)}\n\n"
                except OSError as exc:
                    yield f"event: error\ndata: {json.dumps({'gateway_log_error': str(exc)})}\n\n"
        yield f": heartbeat {time.time()}\n\n"
        await asyncio.sleep(POLL_SECONDS)


@app.get("/api/events")
async def events(
    request: Request,
    token: str | None = Query(default=None),
    boards: str | None = Query(default=None),
    include_archived: bool = False,
    gateway: bool = True,
):
    require_token(request, token)
    boards_filter = [b.strip() for b in boards.split(",") if b.strip()] if boards is not None else None
    return StreamingResponse(
        _event_stream(request, boards_filter, include_archived, gateway),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server:app",
        host=os.environ.get("DASHBOARD_HOST", "127.0.0.1"),
        port=int(os.environ.get("DASHBOARD_PORT", "8788")),
        log_level="info",
    )
