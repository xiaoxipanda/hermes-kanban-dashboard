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
import shlex
import subprocess
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

APP_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Hermes Kanban Dashboard", version="0.4.0")
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
    data = _hermes_json(["boards", "list", "--json"])
    return [b for b in data if not b.get("archived")]


def _board_slugs() -> list[str]:
    return [b["slug"] for b in _list_boards()]


def _ensure_board(board: str) -> None:
    if board not in _board_slugs():
        raise HTTPException(404, f"unknown board {board}")


# ─── read endpoints ────────────────────────────────────────────────────────────


@app.get("/")
def index() -> FileResponse:
    return FileResponse(APP_DIR / "templates" / "index.html")


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


class SwarmPayload(BaseModel):
    title: str = Field(min_length=1, max_length=400)
    body: str | None = None
    workers: int = Field(default=3, ge=1, le=16)
    worker_assignee: str | None = None
    verifier_assignee: str | None = None
    synth_assignee: str | None = None
    tenant: str | None = None
    project: str | None = None


def _ok(args: list[str], stdin_data: str | None = None) -> dict:
    rc, out, err = _run_hermes(args, stdin_data=stdin_data)
    if rc != 0:
        raise HTTPException(400, detail={"cmd": args, "rc": rc, "stderr": err[-800:], "stdout": out[-400:]})
    return {"ok": True, "stdout": out[-1600:], "stderr": err[-400:]}


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
        args.extend(["--reason", payload.reason])
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
    args: list[str] = ["--board", board, "swarm", "--workers", str(payload.workers)]
    if payload.body is not None:
        args.extend(["--body-file", "-"])
    if payload.worker_assignee:
        args.extend(["--worker-assignee", payload.worker_assignee])
    if payload.verifier_assignee:
        args.extend(["--verifier-assignee", payload.verifier_assignee])
    if payload.synth_assignee:
        args.extend(["--synth-assignee", payload.synth_assignee])
    if payload.tenant:
        args.extend(["--tenant", payload.tenant])
    if payload.project:
        args.extend(["--project", payload.project])
    args.append(payload.title)
    return _ok(args, stdin_data=payload.body)


# ─── SSE ───────────────────────────────────────────────────────────────────────


async def _event_stream(request: Request, boards_filter: list[str] | None):
    last_snapshot: dict[str, Any] = {}
    log_pos = GATEWAY_LOG.stat().st_size if GATEWAY_LOG.exists() else 0

    yield f": connected at {time.time()}\n\n"
    while True:
        if await request.is_disconnected():
            break
        try:
            available = _board_slugs()
        except HTTPException as exc:
            yield f"event: error\ndata: {json.dumps({'boards_error': str(exc.detail)})}\n\n"
            available = []
        targets = [b for b in available if (not boards_filter or b in boards_filter)]
        for board in targets:
            try:
                tasks = _hermes_json(["--board", board, "list", "--json", "--sort", "updated"])
            except HTTPException as exc:
                yield f"event: error\ndata: {json.dumps({'board': board, 'error': str(exc.detail)}, ensure_ascii=False)}\n\n"
                continue
            sig = [(t.get("id"), t.get("status"), t.get("assignee"), t.get("completed_at"), t.get("started_at")) for t in tasks]
            if last_snapshot.get(board) != sig:
                last_snapshot[board] = sig
                payload = {"board": board, "tasks": tasks, "ts": time.time()}
                yield f"event: tasks\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
        if GATEWAY_LOG.exists():
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
async def events(request: Request, token: str | None = Query(default=None), boards: str | None = Query(default=None)):
    require_token(request, token)
    boards_filter = [b.strip() for b in boards.split(",") if b.strip()] if boards else None
    return StreamingResponse(_event_stream(request, boards_filter), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server:app",
        host=os.environ.get("DASHBOARD_HOST", "127.0.0.1"),
        port=int(os.environ.get("DASHBOARD_PORT", "8788")),
        log_level="info",
    )
