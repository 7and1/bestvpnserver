# Deployment Guide - BestVPNServer.com

Complete deployment guide for Cloudflare Workers (frontend) and VPS (backend infrastructure).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [VPS Setup (PostgreSQL + Redis)](#vps-setup-postgresql--redis)
- [Database Setup](#database-setup)
- [Frontend Deployment (Cloudflare Workers)](#frontend-deployment-cloudflare-workers)
- [Probe Network Deployment](#probe-network-deployment)
- [Health Checks](#health-checks)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

| Tool          | Version | Purpose                  |
| ------------- | ------- | ------------------------ |
| Node.js       | 18+     | Runtime                  |
| pnpm          | 8+      | Package manager          |
| Docker        | 20+     | Container runtime        |
| Wrangler      | 4+      | Cloudflare CLI           |
| PostgreSQL    | 14+     | Database (on VPS)        |
| Redis         | 7+      | Cache (on VPS)           |
| Flyctl        | 0+      | Fly.io CLI (for probes)  |

### Required Accounts

- Cloudflare account (Workers & Pages)
- VPS provider (any Linux VPS)
- Fly.io account (for probe network)
- Domain name (pointed to Cloudflare)

## Environment Variables

### Frontend Variables (Cloudflare Workers)

Create in Cloudflare Dashboard (Workers & Pages > bestvpnserver-web > Settings > Variables):

```bash
# Database
DATABASE_URL=postgres://user:password@vps-host:5432/bestvpnserver
DB_SCHEMA=public
DB_POOL_MAX=5

# Redis
REDIS_URL=redis://:password@vps-host:6379/0

# Webhook Secrets (generate random strings)
PROBE_WEBHOOK_SECRET=<random-32-char-string>
CRON_SECRET=<random-32-char-string>
DNS_WEBHOOK_SECRET=<random-32-char-string>

# Proxy Grid API
PROXY_GRID_BASE_URL=https://api.example.com
PROXY_GRID_SECRET=<from-proxy-grid>
MERCHANT_API_SECRET=<from-proxy-grid>

# Site
NEXT_PUBLIC_SITE_URL=https://bestvpnserver.com

# Optional
IPINFO_TOKEN=<your-ipinfo-token>
```

### Backend Variables (VPS Docker)

Create `infrastructure/central/.env`:

```bash
# PostgreSQL
POSTGRES_DB=bestvpnserver
POSTGRES_USER=bestvpn
POSTGRES_PASSWORD=<strong-password>

# Redis
REDIS_PASSWORD=<strong-password>
```

### Probe Variables (Fly.io)

Set per-region with `flyctl secrets set`:

```bash
PROBE_ID=iad
WEBHOOK_URL=https://bestvpnserver.com/api/webhooks/probe-results
WEBHOOK_SECRET=<same-as-PROBE_WEBHOOK_SECRET>
REDIS_URL=redis://:password@vps-host:6379/0
PROBE_DRY_RUN=false

# VPN credentials (encrypted)
NORDVPN_USER=<username>
NORDVPN_PASS=<password>
# ... other provider credentials
```

## VPS Setup (PostgreSQL + Redis)

### 1. Initial Server Setup

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Create project directory
mkdir -p /opt/bestvpnserver
cd /opt/bestvpnserver
```

### 2. Deploy Docker Services

```bash
# On your local machine, sync files
cp infrastructure/scripts/vps.env.example infrastructure/scripts/vps.env
# Edit infrastructure/scripts/vps.env with your VPS details

bash infrastructure/scripts/vps-sync.sh

# On VPS, run setup
bash infrastructure/scripts/vps-remote-setup.sh
```

### 3. Verify Services

```bash
# Check Docker containers
docker ps

# Check PostgreSQL logs
docker logs bestvpnserver-postgres

# Check Redis logs
docker logs bestvpnserver-redis
```

### 4. Firewall Configuration

```bash
# Allow SSH
ufw allow 22/tcp

# Allow PostgreSQL (restrict to Workers IPs if possible)
ufw allow 5432/tcp

# Allow Redis (restrict to Workers IPs if possible)
ufw allow 6379/tcp

# Enable firewall
ufw enable
```

## Database Setup

### 1. Run Migrations

```bash
# From project root
pnpm --filter database db:push

# Or using Drizzle Kit
pnpm --filter database db:migrate
```

### 2. Seed Reference Data

```bash
pnpm --filter database db:seed
```

### 3. Create Partitions

```sql
-- Connect to database
psql $DATABASE_URL

-- Create current month partition
CREATE TABLE performance_logs_2026_01 PARTITION OF performance_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Create next month partition
CREATE TABLE performance_logs_2026_02 PARTITION OF performance_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

### 4. Create Materialized Views

```sql
CREATE MATERIALIZED VIEW mv_server_latest_performance AS
SELECT DISTINCT ON (server_id, probe_id)
  server_id, probe_id, measured_at,
  ping_ms, download_mbps, upload_mbps, connection_success
FROM performance_logs
ORDER BY server_id, probe_id, measured_at DESC;

CREATE UNIQUE INDEX idx_mv_latest_perf ON mv_server_latest_performance (server_id, probe_id);

CREATE MATERIALIZED VIEW mv_server_daily_stats AS
SELECT
  server_id, probe_id,
  date_trunc('day', measured_at) AS day,
  COUNT(*) AS sample_count,
  AVG(ping_ms)::NUMERIC(6,2) AS avg_ping,
  AVG(download_mbps)::NUMERIC(7,2) AS avg_download,
  AVG(upload_mbps)::NUMERIC(7,2) AS avg_upload,
  (SUM(CASE WHEN connection_success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100)::NUMERIC(5,2) AS uptime_pct
FROM performance_logs
GROUP BY server_id, probe_id, date_trunc('day', measured_at);

CREATE UNIQUE INDEX idx_mv_daily_stats ON mv_server_daily_stats (server_id, probe_id, day);
```

## Frontend Deployment (Cloudflare Workers)

### 1. Build with OpenNext

```bash
# Build the application
pnpm --filter web cf:build

# This creates:
# - .open-next/worker.js (Worker entry point)
# - .open-next/assets/ (Static assets)
```

### 2. Configure Wrangler

Edit `apps/web/wrangler.jsonc`:

```json
{
  "$schema": "https://json.schemastore.org/wrangler.json",
  "name": "bestvpnserver-web",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "binding": "ASSETS",
    "directory": ".open-next/assets"
  },
  "vars": {
    "BACKEND_URL": "https://api.bestvpnserver.com",
    "NODE_ENV": "production"
  }
}
```

### 3. Deploy

```bash
# Set Cloudflare credentials
export CLOUDFLARE_ACCOUNT_ID=<your-account-id>
export CLOUDFLARE_API_TOKEN=<your-api-token>

# Deploy to Workers
pnpm --filter web cf:deploy
```

### 4. Configure Custom Domain

1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages > bestvpnserver-web
3. Click "Custom Domains"
4. Add `bestvpnserver.com` and `www.bestvpnserver.com`

### 5. Configure DNS

1. In Cloudflare DNS, ensure A records point to your origin (if using proxy)
2. For pure Workers deployment, use CNAME to Workers subdomain
3. Enable "Proxied" (orange cloud) for WAF/protection

### 6. Configure Cron Triggers

In Cloudflare Dashboard:

1. Go to Workers & Pages > bestvpnserver-web > Triggers
2. Add Cron Triggers:

| Cron Expression   | Route                           | Purpose                |
| ----------------- | ------------------------------- | ---------------------- |
| `*/5 * * * *`     | `/api/cron/process-results`     | Process probe results  |
| `0 * * * *`       | `/api/cron/cache-refresh`       | Refresh SEO page cache |
| `0 3 * * *`       | `/api/cron/db-maintenance`      | DB maintenance         |

## Probe Network Deployment

### 1. Install Flyctl

```bash
curl -L https://fly.io/install.sh | sh
```

### 2. Authenticate

```bash
flyctl auth login
```

### 3. Deploy Probes

```bash
cd infrastructure/probe

# Launch in primary region
flyctl launch --regions iad

# Scale to 8 regions
flyctl scale count 1 --regions iad,lax,fra,lhr,sin,nrt,syd,gru

# Set secrets
flyctl secrets set PROBE_WEBHOOK_SECRET=<secret> --app bestvpnserver-probe
flyctl secrets set REDIS_URL=$REDIS_URL --app bestvpnserver-probe

# Set per-region secrets
for region in iad lax fra lhr sin nrt syd gru; do
  flyctl secrets set PROBE_ID=$region --app bestvpnserver-probe --region $region
done
```

## Health Checks

### VPS Services

```bash
# Check PostgreSQL
docker exec bestvpnserver-postgres pg_isready -U bestvpn

# Check Redis
docker exec bestvpnserver-redis redis-cli -a $REDIS_PASSWORD ping

# View logs
docker logs bestvpnserver-postgres --tail 100
docker logs bestvpnserver-redis --tail 100
```

### Cloudflare Workers

```bash
# Using Wrangler
wrangler tail bestvpnserver-web

# Health check endpoint
curl https://bestvpnserver.com/api/health
```

### Probe Network

```bash
# Check all probes
for region in iad lax fra lhr sin nrt syd gru; do
  echo "Checking $region..."
  curl https://$region.bestvpnserver-probe.fly.dev/health
done
```

## Monitoring

### Application Monitoring

Set up monitoring for:

1. **Cloudflare Workers Analytics** - Built-in request metrics
2. **VPS Metrics** - Use node_exporter + Prometheus/Grafana
3. **Probe Health** - Alert on >15min without results

### Key Metrics to Monitor

| Metric               | Alert Threshold    |
| -------------------- | ------------------ |
| Worker error rate    | > 5%               |
| DB connection pool   | > 90%              |
| Redis memory         | > 80%              |
| Probe offline        | > 15 minutes       |
| Queue depth          | > 1000 items       |

### Log Aggregation

```bash
# VPS logs (stream to CloudWatch/LogDNA/etc.)
docker logs bestvpnserver-postgres -f > postgres.log

# Worker logs (via Wrangler)
wrangler tail bestvpnserver-web > worker.log
```

## Troubleshooting

### Workers Deployment Fails

```bash
# Check build logs
pnpm --filter web cf:build --verbose

# Common issues:
# - Missing environment variables
# - Node compatibility (use nodejs_compat)
# - Asset size limits (>25MB)
```

### Database Connection Issues

```bash
# Check VPS firewall
ufw status

# Check PostgreSQL is listening
docker exec bestvpnserver-postgres netstat -tuln | grep 5432

# Test from Workers (run in Worker)
await fetch('https://checkip.amazonaws.com')
```

### Cache Issues

```bash
# Clear Redis cache
docker exec bestvpnserver-redis redis-cli -a $REDIS_PASSWORD FLUSHALL

# Warm up caches
curl https://bestvpnserver.com/api/cron/cache-refresh
```

### Probe Not Reporting

```bash
# Check probe logs
flyctl logs --app bestvpnserver-probe --region iad

# Check probe configuration
flyctl secrets list --app bestvpnserver-probe

# Restart probe
flyctl apps restart bestvpnserver-probe --region iad
```

## Automated Deployment Script

Use the included `deploy.sh` script for streamlined deployment:

```bash
./deploy.sh --production
```

The script:
1. Runs database migrations
2. Builds the frontend
3. Deploys to Cloudflare Workers
4. Runs health checks
5. Reports status

For more details, see `deploy.sh --help`.

---

**Version**: 1.0.0
**Last Updated**: 2026-01-17
