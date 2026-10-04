"""Board creation API regressions. No real Hermes writes."""
import unittest
from unittest.mock import patch

import server


class BoardCreateTests(unittest.TestCase):
    def payload(self, **overrides):
        values = {
            "slug": "content-growth",
            "name": "Content Growth",
            "description": "Content and acquisition",
            "icon": "C",
            "color": "#3663d0",
            "default_workdir": "/tmp/content-growth",
        }
        return server.BoardCreatePayload(**(values | overrides))

    def test_create_uses_native_cli_and_returns_discovered_board(self):
        created = {"slug": "content-growth", "name": "Content Growth", "archived": False}
        with patch.object(server, "_list_boards", side_effect=[[], [created]]), \
             patch.object(server, "_run_hermes", return_value=(0, "Board created", "")) as cli:
            result = server.act_create_board(self.payload())
        self.assertEqual(result, {"ok": True, "board": created})
        cli.assert_called_once_with([
            "boards", "create", "content-growth",
            "--name", "Content Growth",
            "--description", "Content and acquisition",
            "--icon", "C",
            "--color", "#3663d0",
            "--default-workdir", "/tmp/content-growth",
        ])

    def test_duplicate_never_invokes_cli(self):
        with patch.object(server, "_list_boards", return_value=[{"slug": "content-growth"}]), \
             patch.object(server, "_run_hermes") as cli:
            with self.assertRaises(server.HTTPException) as exc:
                server.act_create_board(self.payload())
        self.assertEqual(exc.exception.status_code, 409)
        cli.assert_not_called()

    def test_invalid_slug_color_and_relative_workdir_are_rejected(self):
        cases = [
            self.payload(slug="Bad Slug"),
            self.payload(color="blue"),
            self.payload(default_workdir="relative/path"),
        ]
        with patch.object(server, "_list_boards") as catalog, \
             patch.object(server, "_run_hermes") as cli:
            for payload in cases:
                with self.assertRaises(server.HTTPException) as exc:
                    server.act_create_board(payload)
                self.assertEqual(exc.exception.status_code, 422)
        catalog.assert_not_called()
        cli.assert_not_called()


if __name__ == "__main__":
    unittest.main()
