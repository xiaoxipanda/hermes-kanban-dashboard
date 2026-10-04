"""Opt-in native CLI integration test, with an isolated Hermes + Kanban home.

HERMES_BIN=/path/to/hermes python tests/native_swarm.py
Never starts a dispatcher or an agent. Does not access the user's boards.
"""
import json
import os
from pathlib import Path
import sys
import tempfile


def main():
    binary = os.environ["HERMES_BIN"]
    # A child of the installed Hermes home reuses its managed Python runtime.
    # Kanban storage is still explicitly isolated by HERMES_KANBAN_HOME.
    with tempfile.TemporaryDirectory(prefix="dashboard-native-swarm-",
                                     dir=os.environ.get("HERMES_TEST_PARENT")) as tmp:
        home = Path(tmp)
        os.environ.update(HERMES_HOME=tmp, HERMES_KANBAN_HOME=tmp, HERMES_BIN=binary,
                          HERMES_KANBAN_BOARD="default")
        (home / "config.yaml").write_text("kanban:\n  enabled: false\n")
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
        import server

        def cli(*args):
            rc, out, err = server._run_hermes(list(args))
            assert rc == 0, (args, rc, err, out)
            return out

        cli("boards", "list", "--all", "--json")
        boards = server._list_boards()
        assert all(Path(b["db_path"]).is_relative_to(home) for b in boards), boards
        roles = [a["name"] for a in server._hermes_json(["assignees", "--json"]) if a.get("on_disk")]
        assert len(roles) >= 4, roles
        payload = server.SwarmPayload(
            title="隔离验收 — 一人公司", body="不启动任何模型。仅验证状态机。",
            deliverable="final deliverable", acceptance="gate=pass",
            workers=[{"profile": roles[0], "title": "渠道研究"},
                     {"profile": roles[1], "title": "内容计划"}],
            verifier_assignee=roles[2], synth_assignee=roles[3],
            idempotency_key="native-integration-test",
        )
        created = server.act_swarm("default", payload)["swarm"]
        assert server.act_swarm("default", payload)["swarm"] == created
        assert len(server._hermes_json(["list", "--json"])) == 5
        root = created["root_id"]
        progress = server.show_swarm("default", root)
        assert progress["phase"] == "workers", progress
        assert progress["root"]["status"] == "done"
        assert [c["status"] for c in progress["cards"]] == ["ready", "ready", "todo", "todo"]
        for worker in created["worker_ids"]:
            detail = server._hermes_json(["show", worker, "--json"])
            assert detail["parents"] == [root]
            assert "final deliverable" in detail["task"]["body"]
            cli("complete", worker, "--summary", "Evidence provided")
        progress = server.show_swarm("default", root)
        assert progress["phase"] == "verifier", progress
        assert progress["cards"][-2]["status"] == "ready"
        server.act_block("default", created["verifier_id"], server.ReasonPayload(reason="missing evidence"))
        assert server.show_swarm("default", root)["phase"] == "blocked"
        cli("unblock", created["verifier_id"], "--reason", "evidence supplied")
        cli("complete", created["verifier_id"], "--summary", "Verified", "--metadata", '{"gate":"pass"}')
        progress = server.show_swarm("default", root)
        assert progress["phase"] == "synthesis", progress
        assert progress["gate"] == "pass", progress
        cli("complete", created["synthesizer_id"], "--summary", "Final plan delivered")
        progress = server.show_swarm("default", root)
        assert progress["phase"] == "done", progress
        assert progress["result"] == "Final plan delivered", progress
        assert progress["completed"] == 4
        # A second graph verifies that plain 'done' does not count as gate=pass.
        payload.idempotency_key = "native-unverified-test"
        second = server.act_swarm("default", payload)["swarm"]
        for task in second["worker_ids"] + [second["verifier_id"]]:
            cli("complete", task, "--summary", "No structured gate")
        assert server.show_swarm("default", second["root_id"])["phase"] == "unverified"
        print(json.dumps({"ok": True, "checks": [
            "isolated database paths", "real CLI create", "idempotent retry",
            "shared brief", "root done is not group done", "worker dependencies",
            "blocked verifier", "unblock", "gate pass", "synthesis", "final summary",
            "missing gate remains unverified",
        ]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
