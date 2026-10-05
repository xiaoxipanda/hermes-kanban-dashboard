"""Task routing follows live configuration without issuing accidental writes."""
import subprocess
import unittest
from contextlib import ExitStack
from unittest.mock import patch

import server


class TaskRoutingTests(unittest.TestCase):
    def context(self, enabled=False, archived=False):
        stack = ExitStack()
        stack.enter_context(patch.object(server, "_list_boards", return_value=[
            {"slug": "default", "archived": archived}]))
        stack.enter_context(patch.object(server, "_auto_decompose", return_value=enabled))
        stack.enter_context(patch.object(server, "_hermes_json", return_value=[
            {"name": "ops"}, {"name": "removed", "on_disk": False}]))
        write = stack.enter_context(patch.object(server, "_run_hermes",
            return_value=(0, '{"id":"t_new","status":"ready"}', "")))
        return stack, write

    def test_disabled_or_unknown_triage_never_writes(self):
        for enabled in (False, None):
            for fields in ({}, {"assignee": " "}, {"assignee": "ops", "triage": True}):
                stack, write = self.context(enabled)
                with stack, self.assertRaises(server.HTTPException) as exc:
                    server.act_create("default", server.CreatePayload(title="Task", **fields))
                self.assertEqual(exc.exception.status_code, 422)
                write.assert_not_called()

    def test_assigned_task_remains_available_without_automatic_decomposition(self):
        for enabled in (False, None):
            stack, write = self.context(enabled)
            with stack:
                result = server.act_create("default", server.CreatePayload(
                    title="--triage", body="Preserve body", assignee=" ops "))
            self.assertEqual(result["task"]["status"], "ready")
            args = write.call_args.args[0]
            self.assertEqual(args[-2:], ["--", "--triage"])
            self.assertEqual(args[args.index("--assignee") + 1], "ops")
            self.assertEqual(write.call_args.kwargs["stdin_data"], "Preserve body")

    def test_enabled_triage_keeps_native_creation_path(self):
        stack, write = self.context(True)
        with stack:
            server.act_create("default", server.CreatePayload(title="Plan goal", triage=True))
        self.assertIn("--triage", write.call_args.args[0])

    def test_invalid_assignees_and_archived_boards_never_write(self):
        for assignee, archived in (("missing", False), ("removed", False), ("ops", True)):
            stack, write = self.context(False, archived)
            with stack, self.assertRaises(server.HTTPException):
                server.act_create("default", server.CreatePayload(title="Task", assignee=assignee))
            write.assert_not_called()

    def test_scalar_config_read_handles_unavailable_and_rejects_non_booleans(self):
        for stdout, code, expected in (("false\n", 0, False), ("true\n", 0, True),
                                       ("null", 0, None), ("true", 1, None)):
            with patch.object(server.subprocess, "run", return_value=
                              subprocess.CompletedProcess([], code, stdout, "")) as run:
                self.assertIs(server._auto_decompose(), expected)
                self.assertEqual(run.call_args.args[0][-3:], ["config", "get", "kanban.auto_decompose"])
        for error in (FileNotFoundError(), subprocess.TimeoutExpired("hermes", 8)):
            with patch.object(server.subprocess, "run", side_effect=error):
                self.assertIsNone(server._auto_decompose())


if __name__ == "__main__":
    unittest.main()
