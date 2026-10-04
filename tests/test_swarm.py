"""Validation and progress regressions. No real Hermes writes."""
import unittest
from unittest.mock import patch

from pydantic import ValidationError
import server


class SwarmTests(unittest.TestCase):
    def payload(self, **overrides):
        data = dict(title="Goal", deliverable="Report", acceptance="Evidence",
                    workers=[{"profile": "worker", "title": "Research"}],
                    verifier_assignee="checker", synth_assignee="writer",
                    idempotency_key="stable-retry-key")
        return server.SwarmPayload(**(data | overrides))

    def test_legacy_count_payload_is_rejected(self):
        with self.assertRaises(ValidationError):
            self.payload(workers=3)

    def test_invalid_profiles_and_colons_never_write(self):
        with patch.object(server, "_list_boards", return_value=[{"slug": "a"}]), \
             patch.object(server, "_hermes_json", return_value=[{"name": n} for n in ["worker", "checker", "writer"]]), \
             patch.object(server, "_run_hermes") as write:
            for worker in [{"profile": "unknown", "title": "Research"},
                           {"profile": "worker", "title": "Task: accidentally a skill"}]:
                with self.assertRaises(server.HTTPException) as exc:
                    server.act_swarm("a", self.payload(workers=[worker]))
                self.assertEqual(exc.exception.status_code, 422)
            write.assert_not_called()

    def test_atomic_native_command_and_shared_brief(self):
        with patch.object(server, "_list_boards", return_value=[{"slug": "a"}]), \
             patch.object(server, "_hermes_json", return_value=[{"name": n} for n in ["worker", "checker", "writer"]]), \
             patch.object(server, "_run_hermes", return_value=(0, '{"root_id":"root"}', "")) as write:
            self.assertEqual(server.act_swarm("a", self.payload())["swarm"]["root_id"], "root")
        args = write.call_args.args[0]
        self.assertEqual(args[:4], ["--board", "a", "swarm", "--json"])
        self.assertIn("worker:Research", args)
        self.assertIn("stable-retry-key", args)
        self.assertIn("Report", args[-1])
        self.assertIn("Evidence", args[-1])
        self.assertEqual(args[-2], "--")
        self.assertEqual(write.call_count, 1)

    def test_archived_board_never_writes(self):
        with patch.object(server, "_list_boards", return_value=[{"slug": "a", "archived": True}]), \
             patch.object(server, "_run_hermes") as write:
            with self.assertRaises(server.HTTPException):
                server.act_swarm("a", self.payload())
            write.assert_not_called()


if __name__ == "__main__":
    unittest.main()
