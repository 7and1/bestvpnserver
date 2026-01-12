# VPS Data Layer (Postgres + Redis)

## Quick start

```bash
cd infrastructure/central
cp .env.example .env
docker compose -f docker-compose.vps.yml up -d
```

## Connection strings

- Postgres:
  - `DATABASE_URL=postgres://POSTGRES_USER:POSTGRES_PASSWORD@VPS_HOST:5432/POSTGRES_DB`
  - Add `?sslmode=require` if you terminate TLS in front of Postgres.
- Redis:
  - `REDIS_URL=redis://:REDIS_PASSWORD@VPS_HOST:6379/0`

## Security notes

- Set strong passwords and keep the ports behind a firewall.
- Cloudflare Workers outbound TCP connections do not use fixed IP ranges, so database/Redis allowlists are difficult. Prefer strong auth + TLS, or front the DB with your own secure proxy.

## Maintenance

- Run database and cache refresh tasks on a schedule from a trusted machine:
  - `pnpm --filter web cron:db-maintenance`
  - `pnpm --filter web cron:cache-refresh`

## Systemd timers (recommended)

Copy the unit files and enable timers:

```bash
sudo cp /opt/docker-projects/bestvpnserver/infrastructure/central/systemd/bestvpnserver-*.service /etc/systemd/system/
sudo cp /opt/docker-projects/bestvpnserver/infrastructure/central/systemd/bestvpnserver-*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bestvpnserver-db-maintenance.timer
sudo systemctl enable --now bestvpnserver-cache-refresh.timer
```

Ensure `/opt/docker-projects/bestvpnserver/.env` exists with `DATABASE_URL` and `REDIS_URL`.
