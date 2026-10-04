# Security Policy

## Supported versions

The project is still pre-1.0; only the latest tagged release and `main` receive
fixes. If you're running an older checkout, please update first.

## Threat model

The dashboard is designed for a **trusted LAN or loopback** deployment:

- It executes the `hermes` CLI as the user that launched the server. Anyone
  who can reach the HTTP port can run the exposed write operations
  (`comment`, `block`, `unblock`, `request-review`, `archive`, `reassign`,
  `create`, `swarm`) on behalf of that user.
- If you expose the port beyond `127.0.0.1` / your Tailscale / VPN, you
  **must** set `DASHBOARD_TOKEN` and front the service with TLS (reverse proxy
  via Caddy / nginx / Cloudflare Tunnel / etc.).
- Static assets, SSE, and all `/api/*` endpoints share the same token.
- The dashboard does not store credentials, cookies, or user accounts. The
  only secret is `DASHBOARD_TOKEN` and it should be a long random value.

## Known hardening gaps

- No rate limiting: a token holder can flood the Hermes CLI. Put a proxy in
  front if you need backpressure.
- No per-user permissions: every token holder has the same privilege.
- Task logs are read verbatim from `~/.hermes/kanban/logs/`. Treat any log
  reader as a potential reader of secrets your agents may have written.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Instead, email the maintainers (contact listed in `README.md`) with:

- Affected version / commit
- Reproduction steps
- Impact (what can an attacker do?)
- Suggested fix if you have one

We aim to acknowledge within 72 hours and ship a fix or mitigation within two
weeks for high-severity issues. We will credit reporters in the release notes
unless you request otherwise.
