# Deployment: Cloudflare (OpenNext) + VPS Data Layer

## Overview

- **Frontend + API (Next.js 14)** runs on **Cloudflare Workers** using OpenNext.
- **Postgres + Redis** run on your **VPS** via Docker Compose.
- Probes remain Go binaries (Fly.io or VPS if you want to migrate later).

This keeps the UI and API edge-deployed while avoiding managed DB/cache services.

## Cloudflare (OpenNext)

OpenNext deploys a Worker (visible under **Workers & Pages**), even if you think of it as a Pages frontend.

### Build & deploy

```bash
pnpm --filter web cf:build
pnpm --filter web cf:deploy
```

### Wrangler config

See `apps/web/wrangler.jsonc`. Ensure:

- `compatibility_flags: ["nodejs_compat"]`
- `main: ".open-next/worker.js"`
- `assets: { directory: ".open-next/assets" }`

### Environment variables (Cloudflare)

Set these in the Cloudflare dashboard (Workers & Pages):

- `DATABASE_URL`
- `DB_POOL_MAX` (optional)
- `REDIS_URL`
- `PROBE_WEBHOOK_SECRET`
- `CRON_SECRET`
- `DNS_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `PROXY_GRID_BASE_URL`, `PROXY_GRID_SECRET`, `MERCHANT_API_SECRET`
- `IPINFO_TOKEN` (optional)

## VPS (Postgres + Redis)

Use the Docker setup in `infrastructure/central`.

```bash
cd infrastructure/central
cp .env.example .env
docker compose -f docker-compose.vps.yml up -d
```

Connection strings:

```
DATABASE_URL=postgres://POSTGRES_USER:POSTGRES_PASSWORD@VPS_HOST:5432/POSTGRES_DB
REDIS_URL=redis://:REDIS_PASSWORD@VPS_HOST:6379/0
```

## VPS deploy (rsync/ssh)

Use the helper scripts:

```bash
cp infrastructure/scripts/vps.env.example infrastructure/scripts/vps.env
# edit VPS_HOST, VPS_USER, VPS_PATH

bash infrastructure/scripts/vps-sync.sh
bash infrastructure/scripts/vps-remote-setup.sh
bash infrastructure/scripts/vps-install-systemd.sh
```

The remote setup installs dependencies and starts the Docker data layer.

## Cron jobs (VPS)

Run the maintenance scripts from any trusted machine:

```bash
pnpm --filter web cron:db-maintenance
pnpm --filter web cron:cache-refresh
```

Use `crontab` or `systemd` timers to schedule them.

Systemd unit files are provided in `infrastructure/central/systemd`.

## Security notes

- Restrict Postgres/Redis ports via firewall and strong credentials.
- Cloudflare Workers outbound TCP connections do not use fixed IP ranges, so IP allowlists are hard.
- For stricter isolation, run a private proxy or move DB behind a VPN.
