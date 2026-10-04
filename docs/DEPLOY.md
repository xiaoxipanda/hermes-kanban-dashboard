# Deployment

The dashboard is a single-process FastAPI service with no database of its own.
Everything persistent lives in your Hermes install (`HERMES_HOME`).

## Deployment matrix

| Platform / mode | Recommended | Notes |
|-----------------|-------------|-------|
| macOS, single-user | `./install.sh --launchd` | user agent under `~/Library/LaunchAgents/com.${USER}.hermes-dashboard.plist` |
| macOS, foreground | `./install.sh && ./launch.sh` | useful for development |
| Linux, systemd | render `examples/hermes-dashboard.service.tmpl` with `envsubst` | user units survive logout only with `loginctl enable-linger $USER` |
| Any OS, Docker | `docker compose up -d --build` | mount your hermes install into the container |

In every case the service listens on `DASHBOARD_HOST:DASHBOARD_PORT`
(defaults: `127.0.0.1:8788`). Expose it externally only via a trusted path
(reverse proxy with TLS, Tailscale, Cloudflare Tunnel, SSH port forward).

## Remote access without opening ports

```sh
# Local → remote machine running the dashboard
ssh -L 8788:127.0.0.1:8788 user@your-mac-mini.local
# then: open http://127.0.0.1:8788
```

## Reverse proxy (Caddy)

```caddyfile
hermes.example.com {
    reverse_proxy 127.0.0.1:8788
    header X-Robots-Tag "noindex"
    basicauth {
        ethan $2a$14$...bcrypt...
    }
}
```

Set `DASHBOARD_TOKEN` in `.env` as well; Caddy's auth gates the TCP layer and
the token gates the API layer in case the proxy misconfigures.

## Tailscale

If you already use Tailscale, bind the dashboard to the Tailscale interface:

```sh
export DASHBOARD_HOST="$(tailscale ip -4 | head -n1)"
./launch.sh
```

Only your tailnet peers can reach it. Still set `DASHBOARD_TOKEN` for a second
layer.

## Updating

```sh
git pull
./install.sh         # refreshes .venv/ against new requirements.txt
launchctl kickstart -k gui/$(id -u)/com.${USER}.hermes-dashboard   # macOS
# or
systemctl --user restart hermes-dashboard.service                  # Linux
# or
docker compose up -d --build                                        # Docker
```

## Uninstall

```sh
# macOS
launchctl unload -w ~/Library/LaunchAgents/com.${USER}.hermes-dashboard.plist
rm -f ~/Library/LaunchAgents/com.${USER}.hermes-dashboard.plist

# Linux
systemctl --user disable --now hermes-dashboard.service
rm -f ~/.config/systemd/user/hermes-dashboard.service

# Docker
docker compose down

# Finally, remove the repo clone.
```

Nothing outside the paths above (and your clone directory) is modified by the
dashboard, so uninstall is strictly local.
