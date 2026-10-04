"""Optional browser regression suite. Uses synthetic data; never invokes Hermes.

pip install playwright
CHROME_PATH=/path/to/chrome python tests/ui_smoke.py
Screenshots are written to UI_SCREENSHOTS (default /tmp/hermes-ui-screenshots).
"""
import copy
import json
import os
from pathlib import Path
import socket
import sys
import threading
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
import uvicorn
from playwright.sync_api import sync_playwright, expect

NAMES = [
    "Personal Workspace", "One Personal Company", "Product & Design",
    "Research Lab", "Engineering", "Customer Experience", "Content Studio",
    "Operations", "Growth Experiments", "Knowledge Base", "Hiring",
    "International Launch and Cross-Team Research Workspace",
    "Quality Assurance", "Partnerships", "New Workspace", "Archive 2025",
]
TASK_TITLES = [
    "Compile weekly product feedback and confirm the next iteration scope",
    "Implement live board navigation and task status updates",
    "Review onboarding flow and improve keyboard navigation",
    "Connect the new data source after access is approved",
    "Validate mobile layouts, long titles, and multilingual content",
    "Schedule weekly research synthesis",
    "Define task dependencies and delivery acceptance criteria",
    "Polish design tokens and component spacing",
]
STATUSES = ["running", "ready", "review", "blocked", "todo", "scheduled", "triage", "done"]
NOW = time.time()
TASKS = {
    f"board-{i}": [
        {
            "id": f"t_{i}_{j}", "title": TASK_TITLES[j % 8],
            "body": "## Delivery goal\n\nKeep task ownership, evidence, and next actions explicit.\n\n" + ("- Verify accessibility and responsive behavior\n" * 20),
            "status": STATUSES[j % 8], "assignee": ["dev", "research", "reviewer"][j % 3],
            "priority": 2 if j % 5 == 0 else 0, "created_at": NOW - 3600 * (j + 1),
            "started_at": NOW - 300 if j % 8 == 0 else None,
            "completed_at": NOW - 600 if j % 8 == 7 else None,
            "blocked_reason": "Waiting for the owner to approve data-source access.",
        } for j in range(40 if i == 0 else 8)
    ] for i in range(16)
}
TASKS["board-14"] = []
TASKS["board-0"].append({"id": "t_archived", "title": "Archived task", "status": "archived", "created_at": NOW - 86400})
CALLS = []
WRITES = []
FAIL_BOARDS = set()
SWARMS = {}
EXTRA_BOARDS = []


def catalog():
    boards = [
        {
            "slug": f"board-{i}", "name": name, "description": "Track ownership, progress, blockers, and delivery in one focused workspace.",
            "archived": i == 15, "total": len(TASKS[f"board-{i}"]),
            "counts": {s: sum(t["status"] == s for t in TASKS[f"board-{i}"]) for s in STATUSES + ["archived"]},
        } for i, name in enumerate(NAMES)
    ]
    return boards + copy.deepcopy(EXTRA_BOARDS)


def fixture_cli(args):
    CALLS.append(args[:])
    if args[0] == "boards":
        return catalog()
    if args[0] == "assignees":
        return [{"name": x} for x in ["dev", "research", "reviewer"]]
    board = args[1]
    if args[2] == "list":
        if board in FAIL_BOARDS:
            raise server.HTTPException(500, "Fixture failure")
        return copy.deepcopy([t for t in TASKS[board] if "--archived" in args or t["status"] != "archived"])
    if args[2] == "show":
        task_id = args[3]
        if task_id in SWARMS:
            return {"task": copy.deepcopy(next(t for t in TASKS[board] if t["id"] == task_id)),
                    "comments": [{"body": '[swarm:blackboard] ' + json.dumps({"key": "topology", "value": SWARMS[task_id]})}]}
        return {"task": copy.deepcopy(next(t for t in TASKS[board] if t["id"] == args[3])),
                "latest_summary": "Final delivery" if task_id == "t_synth" else None,
                "runs": [{"id": 1, "metadata": {"gate": "pass"}}] if task_id == "t_verify" else [],
                "comments": [{"author": "reviewer", "body": "Acceptance scope confirmed.", "created_at": NOW}],
                "events": [{"kind": "created", "created_at": NOW}]}
    raise AssertionError(args)


def fixture_write(args, **kwargs):
    WRITES.append(args[:])
    if args[:2] == ["boards", "create"]:
        slug = args[2]
        get = lambda flag, default="": args[args.index(flag) + 1] if flag in args else default
        board = {
            "slug": slug, "name": get("--name", slug), "description": get("--description"),
            "icon": get("--icon"), "color": get("--color"), "default_workdir": get("--default-workdir") or None,
            "archived": False, "total": 0, "counts": {},
        }
        EXTRA_BOARDS.append(board)
        TASKS[slug] = []
        return 0, f"Board {slug!r} created.", ""
    if args[2] == "swarm":
        board = args[1]
        specs = [args[i + 1].split(":", 1) for i, a in enumerate(args) if a == "--worker"]
        topology = {"root_id": "t_root", "worker_ids": [f"t_worker_{i}" for i in range(len(specs))],
                    "verifier_id": "t_verify", "synthesizer_id": "t_synth"}
        SWARMS["t_root"] = topology
        TASKS[board].append({"id": "t_root", "title": "Swarm: Fixture collaboration", "status": "done",
                             "body": "Kanban Swarm v1 planning/root card."})
        for task_id, title, assignee, status in [
            *[(f"t_worker_{i}", title, profile, "ready") for i, (profile, title) in enumerate(specs)],
            ("t_verify", "Verify", "reviewer", "todo"), ("t_synth", "Synthesize", "dev", "todo"),
        ]:
            TASKS[board].append({"id": task_id, "title": title, "assignee": assignee, "status": status,
                                 "body": "Swarm root / shared blackboard: `t_root`."})
        return 0, json.dumps(topology), ""
    task = {"id": "t_created", "title": args[-1], "status": "todo", "created_at": time.time()}
    TASKS[args[1]].append(task)
    return 0, json.dumps(task), ""


def run():
    server._hermes_json = fixture_cli
    server._run_hermes = fixture_write
    server.POLL_SECONDS = 0.15
    server.TOKEN = None
    server.GATEWAY_LOG = Path("/nonexistent/hermes-fixture.log")
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    svc = uvicorn.Server(uvicorn.Config(server.app, host="127.0.0.1", port=port, log_level="error"))
    thread = threading.Thread(target=svc.run, daemon=True)
    thread.start()
    shots = Path(os.environ.get("UI_SCREENSHOTS", "/tmp/hermes-ui-screenshots"))
    shots.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.environ.get("CHROME_PATH", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"), headless=True)
            ctx = browser.new_context(viewport={"width": 1440, "height": 1000}, locale="en-US", reduced_motion="reduce")
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(f"http://127.0.0.1:{port}")
            expect(page.locator(".card")).to_have_count(40)
            expect(page.locator(".board-link")).to_have_count(15)
            page.screenshot(path=str(shots / "desktop-dark.png"))
            print("PASS initial render: 16 boards, 40 tasks", flush=True)

            # Independent per-board filters, archived tasks and reload persistence.
            page.locator("#filter-assignee").select_option("dev")
            page.locator("#search").fill("task status")
            expect(page.locator(".card")).to_have_count(2)
            page.locator('[data-open-board="board-1"].board-link').click()
            expect(page.locator(".card")).to_have_count(8)
            expect(page.locator("#search")).to_have_value("")
            page.locator('[data-open-board="board-0"].board-link').click()
            expect(page.locator("#filter-assignee")).to_have_value("dev")
            expect(page.locator("#search")).to_have_value("task status")
            page.reload()
            expect(page.locator("#search")).to_have_value("task status")
            expect(page.locator(".card")).to_have_count(2)
            page.locator('.clear-filters').click()
            page.locator(".ios-switch").click()
            expect(page.locator(".card")).to_have_count(41)
            expect(page.locator('[data-task-id="t_archived"]')).to_have_count(1)
            TASKS["board-0"][0]["title"] = "Title updated through SSE"
            expect(page.locator('[data-task-id="t_0_0"] .title')).to_have_text("Title updated through SSE")
            expect(page.locator('[data-task-id="t_archived"]')).to_have_count(1)
            page.locator('.clear-filters').click()
            print("PASS filters survive board switches/reload; SSE preserves archived tasks", flush=True)

            # Status collapse and scroll positions survive updates/navigation.
            page.locator('.col-running summary').click()
            expect(page.locator('.col-running')).not_to_have_attribute("open", "")
            TASKS["board-0"][1]["title"] += " · updated"
            expect(page.locator('[data-task-id="t_0_1"] .title')).to_contain_text("updated")
            expect(page.locator('.col-running')).not_to_have_attribute("open", "")
            page.locator('.col-running summary').click()
            page.locator(".columns").hover()
            page.mouse.wheel(0, 400)
            page.wait_for_function("document.querySelector('.columns').scrollTop > 0")
            top = page.locator(".columns").evaluate("(el) => el.scrollTop")
            page.locator('[data-open-board="board-1"].board-link').click()
            page.locator('[data-open-board="board-0"].board-link').click()
            expect(page.locator(".card")).to_have_count(40)
            assert abs(page.locator(".columns").evaluate("(el) => el.scrollTop") - top) < 2
            print("PASS collapsed groups and scroll memory", flush=True)

            # Native keyboard activation, non-disruptive live updates and drafts.
            card = page.locator('[data-task-id="t_0_0"]')
            card.focus()
            page.keyboard.press("Enter")
            expect(page.locator("#drawer-title")).to_have_text("Title updated through SSE")
            page.locator('[data-tab="actions"]').click()
            page.locator("#input-comment").fill("尚未提交的草稿")
            TASKS["board-0"][0]["title"] = "Another live title"
            expect(page.locator("#drawer-update")).to_be_visible()
            expect(page.locator("#drawer-title")).to_have_text("Title updated through SSE")
            expect(page.locator("#input-comment")).to_have_value("尚未提交的草稿")
            page.locator("#drawer-update").click()
            expect(page.locator("#drawer-title")).to_have_text("Another live title")
            expect(page.locator("#input-comment")).to_have_value("尚未提交的草稿")
            page.keyboard.press("Escape")
            expect(page.locator("#task-drawer")).not_to_be_visible()
            page.locator('[data-task-id="t_0_1"]').click()
            page.locator('[data-tab="actions"]').click()
            expect(page.locator("#input-comment")).to_have_value("")
            page.keyboard.press("Escape")
            card.click()
            page.locator('[data-tab="actions"]').click()
            expect(page.locator("#input-comment")).to_have_value("尚未提交的草稿")
            page.locator('[data-tab="overview"]').click()
            expect(page.locator("#drawer-body-md")).to_contain_text("Delivery goal")
            page.screenshot(path=str(shots / "drawer-desktop.png"))
            page.keyboard.press("Escape")
            print("PASS keyboard drawer, live update notice, per-task drafts", flush=True)

            # Single-board status shortcuts.
            expect(page.locator(".board")).to_have_count(1)
            page.locator('[data-board="board-0"] [data-status-filter="blocked"]').click()
            expect(page.locator(".column")).to_have_count(1)
            page.locator('[data-status-filter="blocked"]').click()
            expect(page.locator(".card")).to_have_count(40)

            # Overview must not fetch every board's task list.
            page.locator("#overview-btn").click()
            expect(page.locator(".overview-card")).to_have_count(15)
            expect(page.locator(".board")).to_have_count(0)
            page.locator("#board-search").fill("Research Lab")
            expect(page.locator(".overview-card")).to_have_count(1)
            page.locator('[data-favorite="board-3"]').click()
            page.locator("#board-search").fill("")
            page.locator("#board-scope").select_option("favorites")
            expect(page.locator(".overview-card")).to_have_count(1)
            page.locator("#board-scope").select_option("archived")
            expect(page.locator(".overview-card")).to_have_count(1)
            page.locator(".overview-card").click()
            expect(page.locator(".card")).to_have_count(8)
            expect(page.locator("#new-task-btn")).to_be_disabled()
            page.locator("#board-scope").select_option("active")
            FAIL_BOARDS.add("board-13")
            page.locator('[data-open-board="board-13"].board-link').click()
            expect(page.locator('[data-retry="board-13"]')).to_be_visible()
            FAIL_BOARDS.clear()
            page.locator('[data-retry="board-13"]').click()
            expect(page.locator(".card")).to_have_count(8)
            expect(page.locator("#workspace-notice")).not_to_be_visible()
            page.locator("#search").fill("no-matches-123")
            expect(page.locator(".empty-state")).to_contain_text("No matching")
            page.locator(".empty-state button").click()
            expect(page.locator(".card")).to_have_count(8)
            page.locator('[data-open-board="board-14"].board-link').click()
            expect(page.locator(".empty-state")).to_be_visible()
            expect(page.locator("#new-task-btn")).to_be_enabled()
            print("PASS status shortcuts, favorites, search, archived boards, empty state", flush=True)

            # The close button must work when required fields are still empty.
            page.locator("#new-task-btn").click()
            page.locator('#create-dialog button[value="close"]').click()
            expect(page.locator("#create-dialog")).not_to_be_visible()
            page.locator("#new-task-btn").click()
            expect(page.locator("#create-board")).to_have_value("board-14")
            page.locator("#create-title").fill("Fixture-only create")
            page.locator("#create-submit").dblclick()
            expect(page.locator("#drawer-title")).to_have_text("Fixture-only create")
            assert len(WRITES) == 1, WRITES
            page.keyboard.press("Escape")
            print("PASS create target and duplicate-click protection", flush=True)

            # Create a physical board, validate its fields, and open it.
            page.locator("#new-board-btn").click()
            expect(page.locator("#board-color")).to_have_count(0)
            expect(page.locator(".custom-icon")).to_have_count(0)
            page.locator("#board-name").fill("Content Growth")
            expect(page.locator("#board-slug")).to_have_value("content-growth")
            page.locator("#board-description").fill("Content and acquisition experiments")
            page.locator('[data-board-icon="🚀"]').click()
            expect(page.locator("#board-icon")).to_have_value("🚀")
            expect(page.locator('[data-board-icon="🚀"]')).to_have_attribute("aria-pressed", "true")
            page.locator("#board-dialog details.advanced summary").click()
            page.locator("#board-workdir").fill("relative/path")
            page.locator("#board-submit").click()
            expect(page.locator("#board-dialog")).to_be_visible()
            expect(page.locator("#board-workdir")).to_have_js_property("validationMessage", "The default work directory must be an absolute path starting with /.")
            page.locator("#board-workdir").fill("/tmp/content-growth")
            page.set_viewport_size({"width": 390, "height": 844})
            assert page.locator("#board-dialog").evaluate("(el) => el.scrollWidth <= el.clientWidth")
            page.screenshot(path=str(shots / "board-create-mobile.png"))
            page.set_viewport_size({"width": 1440, "height": 1000})
            page.locator("#board-submit").dblclick()
            expect(page.locator("#board-dialog")).not_to_be_visible()
            expect(page.locator("#workspace-title")).to_have_text("Content Growth")
            expect(page.locator(".empty-state")).to_be_visible()
            expect(page.locator('[data-open-board="content-growth"]')).to_have_count(1)
            expect(page.locator('[data-open-board="content-growth"] .board-avatar')).to_have_text("🚀")
            board_writes = [c for c in WRITES if c[:2] == ["boards", "create"]]
            assert len(board_writes) == 1 and "--color" not in board_writes[0]
            page.locator("#new-swarm-btn").click()
            expect(page.locator("#swarm-board")).to_have_value("content-growth")
            page.locator('#swarm-dialog button[value="close"]').click()
            page.locator('[data-open-board="board-14"].board-link').click()
            print("PASS board creation, validation, duplicate-click protection and workflow targeting", flush=True)

            # Collaboration form, responsive flow, actual API payload and progress.
            page.locator("#new-swarm-btn").click()
            expect(page.locator("#swarm-board")).to_have_value("board-14")
            page.locator("#swarm-title").fill("Fixture collaboration")
            page.locator("#swarm-deliverable").fill("A final plan")
            page.locator("#swarm-acceptance").fill("Sources and budget verified")
            page.locator(".swarm-profile").select_option("research")
            page.locator(".swarm-assignment").fill("Research channels")
            page.locator("#swarm-add-worker").click()
            page.locator(".swarm-profile").nth(1).select_option("dev")
            page.locator(".swarm-assignment").nth(1).fill("Plan delivery")
            page.locator("#swarm-verifier").select_option("reviewer")
            page.locator("#swarm-synth").select_option("dev")
            expect(page.locator("#swarm-preview")).to_contain_text("Research channels")
            page.set_viewport_size({"width": 390, "height": 844})
            page.locator("#swarm-preview").scroll_into_view_if_needed()
            assert page.locator("#swarm-dialog").evaluate("(el) => el.scrollWidth <= el.clientWidth")
            page.screenshot(path=str(shots / "swarm-mobile-preview.png"))
            page.set_viewport_size({"width": 1440, "height": 1000})
            page.locator("#swarm-submit").dblclick()
            expect(page.locator("#swarm-progress-dialog")).to_be_visible()
            expect(page.locator("#swarm-progress-content")).to_contain_text("0 / 4")
            expect(page.locator("#swarm-progress-content")).to_contain_text("Assignments queued")
            assert len([c for c in WRITES if c[2] == "swarm"]) == 1
            for task in TASKS["board-14"]:
                if task["id"] in ["t_worker_0", "t_worker_1", "t_verify", "t_synth"]:
                    task["status"] = "done"
            page.locator("#swarm-progress-refresh").click()
            expect(page.locator("#swarm-progress-content")).to_contain_text("Collaboration complete")
            expect(page.locator(".swarm-output")).to_contain_text("Final delivery")
            page.screenshot(path=str(shots / "swarm-progress.png"))
            page.locator('[data-swarm-task="t_synth"]').click()
            expect(page.locator("#drawer-output")).to_have_text("Final delivery")
            page.locator("#drawer-swarm").click()
            expect(page.locator("#swarm-progress-dialog")).to_be_visible()
            page.keyboard.press("Escape")
            page.reload()
            expect(page.locator('[data-swarm-root="t_root"]')).to_be_visible()
            page.locator('[data-swarm-root="t_root"]').click()
            expect(page.locator("#swarm-progress-content")).to_contain_text("4 / 4")
            page.keyboard.press("Escape")
            print("PASS collaboration form, duplicate protection, progress, result, reload discovery", flush=True)

            # Responsive screenshots, both themes and both languages.
            page.locator('[data-open-board="board-0"].board-link').click()
            page.locator("#theme-btn").click()
            page.screenshot(path=str(shots / "desktop-light.png"))
            page.locator("#overview-btn").click()
            expect(page.locator("#sse-text")).to_have_text("Live")
            page.screenshot(path=str(shots / "overview-light.png"))
            page.locator('[data-open-board="board-0"].board-link').click()
            for width, height in [(820, 1000), (556, 916), (390, 844)]:
                page.set_viewport_size({"width": width, "height": height})
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), width
                expect(page.locator("#nav-toggle")).to_be_visible()
                page.screenshot(path=str(shots / f"mobile-{width}.png"))
            page.locator("#nav-toggle").click()
            page.screenshot(path=str(shots / "mobile-navigation.png"))
            page.locator("#theme-btn").click()
            page.locator("#lang-btn").click()
            page.keyboard.press("Escape")
            page.locator("#activity-toggle").click()
            expect(page.locator("#activity-panel")).to_be_visible()
            page.screenshot(path=str(shots / "mobile-activity.png"))
            page.locator("#activity-close").click()
            page.locator(".card").first.click()
            expect(page.locator("#drawer-body-md")).to_contain_text("Delivery goal")
            page.screenshot(path=str(shots / "mobile-drawer.png"))
            page.keyboard.press("Escape")
            assert not errors, errors
            print("PASS desktop/tablet/phone, themes/languages, activity; no JS errors", flush=True)
            browser.close()
    finally:
        svc.should_exit = True
        thread.join(timeout=5)


if __name__ == "__main__":
    run()
