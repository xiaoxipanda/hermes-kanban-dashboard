"""SSE regressions: selected boards, archived tasks and complete task updates."""
import asyncio
import json
import unittest
from unittest.mock import AsyncMock, patch

import server


class ConnectedRequest:
    async def is_disconnected(self):
        return False


class StreamTests(unittest.IsolatedAsyncioTestCase):
    async def cycle(self, stream):
        result = []
        async for event in stream:
            result.append(event)
            if event.startswith(": heartbeat"):
                break
        return result

    async def test_overview_fetches_catalog_without_task_lists(self):
        with patch.object(server, "_list_boards", return_value=[{"slug": "a"}, {"slug": "b"}]), \
             patch.object(server, "_hermes_json") as cli:
            stream = server._event_stream(ConnectedRequest(), [], gateway=False)
            events = await self.cycle(stream)
            await stream.aclose()
        self.assertTrue(any(event.startswith("event: boards") for event in events))
        cli.assert_not_called()

    async def test_selected_board_keeps_archived_flag(self):
        calls = []

        def cli(args):
            calls.append(args)
            return [{"id": "t_1", "status": "archived"}]

        with patch.object(server, "_list_boards", return_value=[{"slug": "a"}, {"slug": "b"}]), \
             patch.object(server, "_hermes_json", side_effect=cli):
            stream = server._event_stream(ConnectedRequest(), ["b"], include_archived=True, gateway=False)
            events = await self.cycle(stream)
            await stream.aclose()
        self.assertEqual(calls, [["--board", "b", "list", "--json", "--sort", "updated", "--archived"]])
        payload = json.loads(next(event for event in events if event.startswith("event: tasks")).split("data: ", 1)[1])
        self.assertEqual(payload["tasks"][0]["status"], "archived")

    async def test_title_only_change_emits_new_snapshot_and_reuses_catalog(self):
        with patch.object(server, "_list_boards", return_value=[{"slug": "a"}]) as catalog, \
             patch.object(server, "_hermes_json", side_effect=[
                 [{"id": "t_1", "status": "ready", "title": "Before"}],
                 [{"id": "t_1", "status": "ready", "title": "After"}],
             ]), patch.object(server.asyncio, "sleep", new_callable=AsyncMock):
            stream = server._event_stream(ConnectedRequest(), ["a"], gateway=False)
            first = await self.cycle(stream)
            second = await self.cycle(stream)
            await stream.aclose()
        self.assertEqual(catalog.call_count, 1)
        self.assertTrue(any('"Before"' in event for event in first))
        self.assertTrue(any('"After"' in event for event in second))

    async def test_omitted_filter_remains_backward_compatible(self):
        with patch.object(server, "_list_boards", return_value=[{"slug": "a"}, {"slug": "b"}]), \
             patch.object(server, "_hermes_json", return_value=[]) as cli:
            stream = server._event_stream(ConnectedRequest(), None, gateway=False)
            await self.cycle(stream)
            await stream.aclose()
        self.assertEqual(cli.call_count, 2)
        self.assertFalse(any("--archived" in call.args[0] for call in cli.call_args_list))


if __name__ == "__main__":
    unittest.main()
