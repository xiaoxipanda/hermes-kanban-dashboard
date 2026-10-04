# Contributing

Thanks for your interest in improving **Hermes Kanban Dashboard**! This project is
intentionally small and tries to stay a thin, generic UI on top of the Hermes
`kanban` CLI. The guidelines below exist to keep it that way.

## Scope and non-goals

- **In scope**: anything that makes the live-view / Markdown rendering / write
  operations / i18n / theming / deployment nicer, as long as it keeps using the
  `hermes kanban … --json` interface.
- **Out of scope**: direct SQLite access, patching Hermes core, hard-coding
  specific board names, assignees, or workflow conventions.

If you need something the CLI doesn't expose, please open an issue to discuss
upstreaming it to Hermes first.

## Local development

```sh
git clone <your-fork-url>
cd hermes-kanban-dashboard
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env    # edit if needed
./launch.sh             # or:  .venv/bin/python server.py
```

Open <http://127.0.0.1:8788>. If you don't have Hermes installed locally, point
`HERMES_BIN` / `HERMES_HOME` at a remote mount, or run the dashboard on the
machine that already hosts Hermes.

## Code style

- **Python**: standard `ruff`/`black` conventions; type hints on public functions.
  Keep `server.py` dependency-light — FastAPI + Pydantic + stdlib only.
- **JavaScript**: vanilla ES2020, no build step. Don't introduce a bundler, a
  framework, or TypeScript. The only external script is `marked` from a CDN.
- **CSS**: variables in `:root` / `[data-theme="light"]`; avoid component
  libraries.
- **Strings**: user-visible text must go through `window.I18N` with both `zh`
  and `en` entries. Do not hard-code localized strings in `app.js` /
  `index.html`.

## Pull request checklist

- [ ] `python -m compileall server.py` passes.
- [ ] `node --check static/app.js` and `node --check static/i18n.js` pass.
- [ ] You updated `CHANGELOG.md` under the next unreleased version.
- [ ] If you changed deployment, you updated both `launch.sh` and
      `examples/com.hermes-dashboard.plist.tmpl`.
- [ ] If you added an API endpoint, you updated `README.md` and (if relevant)
      the Help overlay in `static/i18n.js`.
- [ ] If you added or renamed an i18n key, both `zh` and `en` are present.

## Reporting bugs

See [SECURITY.md](SECURITY.md) for security issues. For non-security bugs, open
an issue with:

- Hermes version (`hermes --version`), OS, Python version
- Minimal steps to reproduce
- What you expected vs. what happened
- Relevant lines from `~/.hermes/logs/gateway.log` and the browser console

## License

By contributing, you agree your contributions will be licensed under the MIT
License (see [LICENSE](LICENSE)).
