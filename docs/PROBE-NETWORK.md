# Probe Network Architecture - BestVPNServer.com

## Overview

Distributed VPN testing infrastructure across 8 global regions.

---

## 1. Probe Locations

| Region                    | Fly.io Code | Purpose                    | VPS Cost |
| ------------------------- | ----------- | -------------------------- | -------- |
| US East (Virginia)        | iad         | North America baseline     | $5/mo    |
| US West (LA)              | lax         | West coast latency         | $5/mo    |
| Europe (Frankfurt)        | fra         | EU baseline                | $5/mo    |
| UK (London)               | lhr         | Streaming tests (BBC, etc) | $5/mo    |
| Asia (Singapore)          | sin         | SEA coverage               | $5/mo    |
| Asia (Tokyo)              | nrt         | East Asia, gaming          | $5/mo    |
| Australia (Sydney)        | syd         | Oceania                    | $5/mo    |
| South America (São Paulo) | gru         | LATAM coverage             | $5/mo    |

**Total Infrastructure**: ~$40/month

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PROBE NODE (per region)                   │
│  Platform: Fly.io Machine (1 vCPU, 512MB)                   │
│  Runtime: Go binary (fast startup, low memory)              │
├─────────────────────────────────────────────────────────────┤
│  Components:                                                 │
│  1. Scheduler (pulls job queue from Redis)                  │
│  2. VPN Connector (OpenVPN/WireGuard client)                │
│  3. Test Suite (speed, latency, leak detection)             │
│  4. Reporter (POST results to API webhook)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow

```
Probe Node (Fly.io)
       │
       │ 1. Pull job from queue
       ▼
┌──────────────────┐
│   VPS Redis      │  ← Job queue: probe:jobs:{region}
└──────────────────┘
       │
       │ 2. Connect to VPN server
       ▼
┌──────────────────┐
│  VPN Provider    │  ← OpenVPN/WireGuard
└──────────────────┘
       │
       │ 3. Run tests
       ▼
┌──────────────────┐
│  Test Targets    │  ← Netflix, Google DNS, Speed servers
└──────────────────┘
       │
       │ 4. POST results (JWT signed)
       ▼
┌──────────────────┐
│  API Webhook     │  ← /api/webhooks/probe-results
└──────────────────┘
       │
       │ 5. Queue for batch insert
       ▼
┌──────────────────┐
│  Redis Buffer    │  ← LPUSH probe:results:queue
└──────────────────┘
       │
       │ 6. Cron job (every 5 min)
       ▼
┌──────────────────┐
│  VPS Postgres    │  ← Batch INSERT
└──────────────────┘
```

---

## 4. Tiered Testing Strategy

| Tier | Servers | Frequency     | Tests              | Est. Tests/Day |
| ---- | ------- | ------------- | ------------------ | -------------- |
| Hot  | ~500    | Every 15 min  | Full suite         | 48,000         |
| Warm | ~2,000  | Every 2 hours | Connection + speed | 24,000         |
| Cold | ~10,000 | Daily         | Connection only    | 10,000         |

**Total**: ~82,000 tests/day across 8 probes = ~10,000 per probe

---

## 5. Go Probe Binary

### Project Structure

```
probes/
├── cmd/
│   └── probe/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── connector/
│   │   ├── openvpn.go
│   │   └── wireguard.go
│   ├── tester/
│   │   ├── latency.go
│   │   ├── speed.go
│   │   └── streaming.go
│   └── reporter/
│       └── webhook.go
├── Dockerfile
├── fly.toml
└── go.mod
```

### Main Entry Point

```go
// cmd/probe/main.go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"

    "probe/internal/config"
    "probe/internal/connector"
    "probe/internal/reporter"
    "probe/internal/tester"
)

func main() {
    cfg := config.Load()

    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Handle graceful shutdown
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
    go func() {
        <-sigCh
        log.Println("Shutting down...")
        cancel()
    }()

    // Main loop
    for {
        select {
        case <-ctx.Done():
            return
        default:
            job, err := fetchNextJob(cfg.RedisURL, cfg.ProbeID)
            if err != nil {
                log.Printf("No jobs available: %v", err)
                time.Sleep(10 * time.Second)
                continue
            }

            result := runTest(ctx, cfg, job)
            if err := reporter.Send(cfg.WebhookURL, cfg.WebhookSecret, result); err != nil {
                log.Printf("Failed to report: %v", err)
            }
        }
    }
}

func runTest(ctx context.Context, cfg *config.Config, job Job) TestResult {
    // 1. Connect to VPN
    conn, err := connector.Connect(ctx, job.Server, job.Protocol)
    if err != nil {
        return TestResult{
            ServerID: job.ServerID,
            Success:  false,
            Error:    err.Error(),
        }
    }
    defer conn.Disconnect()

    // 2. Run tests
    result := TestResult{
        ServerID:          job.ServerID,
        ProbeID:           cfg.ProbeID,
        Success:           true,
        ConnectionTimeMs:  conn.ConnectionTime.Milliseconds(),
    }

    // Latency test
    result.PingMs = tester.MeasureLatency(job.LatencyTargets)

    // Speed test (if tier allows)
    if job.Tier != "cold" {
        result.DownloadMbps, result.UploadMbps = tester.MeasureSpeed()
    }

    // Streaming check (if tier is hot)
    if job.Tier == "hot" {
        result.StreamingResults = tester.CheckStreaming(job.StreamingTargets)
    }

    return result
}
```

### VPN Connector

```go
// internal/connector/wireguard.go
package connector

import (
    "context"
    "fmt"
    "os/exec"
    "time"
)

type WireGuardConnection struct {
    Interface      string
    ConfigPath     string
    ConnectionTime time.Duration
}

func ConnectWireGuard(ctx context.Context, server Server) (*WireGuardConnection, error) {
    configPath := fmt.Sprintf("/tmp/wg-%s.conf", server.ID)

    // Write config
    if err := writeWireGuardConfig(configPath, server); err != nil {
        return nil, err
    }

    start := time.Now()

    // Bring up interface
    cmd := exec.CommandContext(ctx, "wg-quick", "up", configPath)
    if err := cmd.Run(); err != nil {
        return nil, fmt.Errorf("wg-quick up failed: %w", err)
    }

    return &WireGuardConnection{
        Interface:      fmt.Sprintf("wg-%s", server.ID),
        ConfigPath:     configPath,
        ConnectionTime: time.Since(start),
    }, nil
}

func (c *WireGuardConnection) Disconnect() error {
    cmd := exec.Command("wg-quick", "down", c.ConfigPath)
    return cmd.Run()
}
```

### Speed Test

```go
// internal/tester/speed.go
package tester

import (
    "io"
    "net/http"
    "time"
)

const (
    SpeedTestURL     = "https://speed.cloudflare.com/__down?bytes=10000000" // 10MB
    SpeedTestTimeout = 30 * time.Second
)

func MeasureSpeed() (downloadMbps, uploadMbps float64) {
    client := &http.Client{Timeout: SpeedTestTimeout}

    // Download test
    start := time.Now()
    resp, err := client.Get(SpeedTestURL)
    if err != nil {
        return 0, 0
    }
    defer resp.Body.Close()

    bytes, _ := io.Copy(io.Discard, resp.Body)
    elapsed := time.Since(start).Seconds()

    downloadMbps = float64(bytes) * 8 / elapsed / 1_000_000

    // Upload test (simplified - use actual speed test API in production)
    uploadMbps = downloadMbps * 0.3 // Approximate

    return downloadMbps, uploadMbps
}
```

### Streaming Check

```go
// internal/tester/streaming.go
package tester

import (
    "net/http"
    "strings"
    "time"
)

type StreamingResult struct {
    Platform   string `json:"platform"`
    IsUnlocked bool   `json:"is_unlocked"`
    ResponseMs int64  `json:"response_ms"`
}

var streamingEndpoints = map[string]string{
    "netflix-us":   "https://www.netflix.com/title/80018499",
    "netflix-jp":   "https://www.netflix.com/jp/title/80018499",
    "disney-plus":  "https://www.disneyplus.com/",
    "hbo-max":      "https://www.max.com/",
    "bbc-iplayer": "https://www.bbc.co.uk/iplayer",
}

func CheckStreaming(platforms []string) []StreamingResult {
    results := make([]StreamingResult, 0, len(platforms))

    client := &http.Client{
        Timeout: 10 * time.Second,
        CheckRedirect: func(req *http.Request, via []*http.Request) error {
            return http.ErrUseLastResponse // Don't follow redirects
        },
    }

    for _, platform := range platforms {
        url, ok := streamingEndpoints[platform]
        if !ok {
            continue
        }

        start := time.Now()
        resp, err := client.Get(url)
        elapsed := time.Since(start).Milliseconds()

        result := StreamingResult{
            Platform:   platform,
            ResponseMs: elapsed,
        }

        if err != nil {
            result.IsUnlocked = false
        } else {
            defer resp.Body.Close()
            // Check if we got the actual content (not geo-blocked)
            result.IsUnlocked = isUnlocked(resp, platform)
        }

        results = append(results, result)
    }

    return results
}

func isUnlocked(resp *http.Response, platform string) bool {
    // Platform-specific unlock detection
    switch {
    case strings.HasPrefix(platform, "netflix"):
        // Netflix returns 200 for available content, redirects for blocked
        return resp.StatusCode == 200
    case platform == "disney-plus":
        return resp.StatusCode == 200
    case platform == "bbc-iplayer":
        // BBC blocks with 403 or redirects to unavailable page
        return resp.StatusCode == 200 && !strings.Contains(resp.Header.Get("Location"), "unavailable")
    default:
        return resp.StatusCode == 200
    }
}
```

---

## 6. Dockerfile

```dockerfile
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o probe ./cmd/probe

FROM alpine:3.19

# Install VPN clients
RUN apk add --no-cache \
    openvpn \
    wireguard-tools \
    ca-certificates \
    curl

COPY --from=builder /app/probe /usr/local/bin/probe

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["probe"]
```

---

## 7. Fly.io Configuration

```toml
# fly.toml
app = "bestvpnserver-probe"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  PROBE_ID = "iad"
  REDIS_URL = "redis://..."
  WEBHOOK_URL = "https://bestvpnserver.com/api/webhooks/probe-results"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512

# Deploy to multiple regions
# fly scale count 1 --region iad,lax,fra,lhr,sin,nrt,syd,gru
```

---

## 8. Webhook Ingestion

```typescript
// app/api/webhooks/probe-results/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { verifyProbeSignature } from "@/lib/auth";
import { ProbeResultSchema } from "@/packages/types";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-probe-signature");
  const body = await request.json();

  // Verify request is from legitimate probe
  if (!verifyProbeSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Validate payload
  const result = ProbeResultSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Push to Redis queue
  await redis.lpush(
    "probe:results:queue",
    JSON.stringify({
      ...result.data,
      receivedAt: Date.now(),
    }),
  );

  return NextResponse.json({ status: "queued" });
}
```

---

## 9. Batch Processing Cron

```typescript
// app/api/cron/process-results/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { performanceLogs, streamingChecks } from "@/packages/database/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify Cloudflare Cron or VPS timer secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Process queue (batch of 1000)
  const results = await redis.lrange("probe:results:queue", 0, 999);
  if (results.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // Parse and prepare for insert
  const performanceRows = [];
  const streamingRows = [];

  for (const raw of results) {
    const result = JSON.parse(raw);

    performanceRows.push({
      serverId: result.serverId,
      probeId: result.probeId,
      measuredAt: new Date(result.measuredAt),
      pingMs: result.pingMs,
      downloadMbps: result.downloadMbps,
      uploadMbps: result.uploadMbps,
      connectionSuccess: result.success,
      connectionTimeMs: result.connectionTimeMs,
    });

    if (result.streamingResults) {
      for (const sr of result.streamingResults) {
        streamingRows.push({
          serverId: result.serverId,
          platformId: sr.platformId,
          checkedAt: new Date(result.measuredAt),
          isUnlocked: sr.isUnlocked,
          responseTimeMs: sr.responseMs,
        });
      }
    }
  }

  // Batch insert
  await db.transaction(async (tx) => {
    if (performanceRows.length > 0) {
      await tx.insert(performanceLogs).values(performanceRows);
    }
    if (streamingRows.length > 0) {
      await tx.insert(streamingChecks).values(streamingRows);
    }
  });

  // Remove processed items
  await redis.ltrim("probe:results:queue", results.length, -1);

  // Refresh materialized views
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_server_latest_performance`,
  );

  return NextResponse.json({
    processed: results.length,
    performance: performanceRows.length,
    streaming: streamingRows.length,
  });
}
```

---

## 10. Monitoring

### Health Check Endpoint

```go
// internal/health/health.go
package health

import (
    "encoding/json"
    "net/http"
    "time"
)

type Status struct {
    Status      string    `json:"status"`
    ProbeID     string    `json:"probe_id"`
    Uptime      string    `json:"uptime"`
    LastTest    time.Time `json:"last_test"`
    TestsToday  int       `json:"tests_today"`
}

func Handler(probeID string, stats *Stats) http.HandlerFunc {
    startTime := time.Now()

    return func(w http.ResponseWriter, r *http.Request) {
        status := Status{
            Status:     "healthy",
            ProbeID:    probeID,
            Uptime:     time.Since(startTime).String(),
            LastTest:   stats.LastTestTime,
            TestsToday: stats.TestsToday,
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(status)
    }
}
```

### Alerting

```typescript
// lib/monitoring.ts
export async function checkProbeHealth() {
  const probes = ["iad", "lax", "fra", "lhr", "sin", "nrt", "syd", "gru"];

  for (const probe of probes) {
    const lastResult = await redis.get(`probe:${probe}:last_result`);
    const lastTime = lastResult
      ? new Date(JSON.parse(lastResult).receivedAt)
      : null;

    if (!lastTime || Date.now() - lastTime.getTime() > 15 * 60 * 1000) {
      await sendAlert({
        type: "probe_offline",
        probe,
        lastSeen: lastTime,
      });
    }
  }
}
```

---

## 11. Credential Management

### Secrets Storage

```bash
# Fly.io secrets (per region)
fly secrets set \
  NORDVPN_USER=xxx \
  NORDVPN_PASS=xxx \
  EXPRESSVPN_ACTIVATION=xxx \
  SURFSHARK_USER=xxx \
  SURFSHARK_PASS=xxx \
  WEBHOOK_SECRET=xxx \
  --app bestvpnserver-probe
```

### Config Encryption

```go
// internal/config/secrets.go
package config

import (
    "crypto/aes"
    "crypto/cipher"
    "encoding/base64"
    "os"
)

func DecryptCredential(encrypted string) (string, error) {
    key := []byte(os.Getenv("ENCRYPTION_KEY"))

    ciphertext, _ := base64.StdEncoding.DecodeString(encrypted)

    block, err := aes.NewCipher(key)
    if err != nil {
        return "", err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }

    nonceSize := gcm.NonceSize()
    nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

    plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
    if err != nil {
        return "", err
    }

    return string(plaintext), nil
}
```

---

**Version**: 1.0
**Last Updated**: 2026-01-11
