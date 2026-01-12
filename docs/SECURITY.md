# Security Guidelines - BestVPNServer.com

## Overview

Security considerations for a VPN monitoring platform with distributed probe infrastructure.

---

## 1. Threat Model

### Assets to Protect

| Asset                    | Sensitivity | Impact if Compromised                |
| ------------------------ | ----------- | ------------------------------------ |
| VPN Provider Credentials | Critical    | Service access, legal liability      |
| User Data (if any)       | High        | Privacy breach, GDPR violation       |
| Probe Nodes              | Medium      | False data injection, resource abuse |
| API Keys                 | High        | Service disruption, cost explosion   |
| Affiliate Links          | Medium      | Revenue theft                        |

### Attack Vectors

| Vector                       | Likelihood | Mitigation                        |
| ---------------------------- | ---------- | --------------------------------- |
| Credential theft from probes | Medium     | Encrypted storage, rotation       |
| API abuse / DDoS             | High       | Rate limiting, WAF                |
| Probe impersonation          | Medium     | JWT authentication, IP allowlist  |
| Affiliate link manipulation  | Low        | Server-side rendering, validation |
| Data injection attacks       | Medium     | Input validation, signed payloads |

---

## 2. Credential Management

### VPN Credentials on Probes

```go
// NEVER store credentials in plaintext
// Use encrypted environment variables

// internal/config/secrets.go
package config

import (
    "crypto/aes"
    "crypto/cipher"
    "encoding/base64"
    "os"
)

type VPNCredentials struct {
    Provider string
    Username string
    Password string
}

func GetVPNCredentials(provider string) (*VPNCredentials, error) {
    encryptedUser := os.Getenv(fmt.Sprintf("%s_USER_ENC", strings.ToUpper(provider)))
    encryptedPass := os.Getenv(fmt.Sprintf("%s_PASS_ENC", strings.ToUpper(provider)))

    username, err := decrypt(encryptedUser)
    if err != nil {
        return nil, err
    }

    password, err := decrypt(encryptedPass)
    if err != nil {
        return nil, err
    }

    return &VPNCredentials{
        Provider: provider,
        Username: username,
        Password: password,
    }, nil
}

func decrypt(encrypted string) (string, error) {
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

### Fly.io Secrets Management

```bash
# Set encrypted secrets per region
fly secrets set \
  ENCRYPTION_KEY=$(openssl rand -hex 32) \
  NORDVPN_USER_ENC=$(encrypt "username") \
  NORDVPN_PASS_ENC=$(encrypt "password") \
  WEBHOOK_SECRET=$(openssl rand -hex 32) \
  --app bestvpnserver-probe

# Rotate secrets quarterly
fly secrets set ENCRYPTION_KEY=$(openssl rand -hex 32) --app bestvpnserver-probe
```

### Credential Rotation Script

```typescript
// scripts/rotate-credentials.ts
import { encrypt } from "./crypto";

async function rotateCredentials() {
  const providers = ["nordvpn", "expressvpn", "surfshark"];

  for (const provider of providers) {
    // Fetch new credentials from secure vault
    const creds = await getFromVault(`vpn/${provider}`);

    // Encrypt with new key
    const encUser = await encrypt(creds.username);
    const encPass = await encrypt(creds.password);

    // Update Fly.io secrets
    await exec(
      `fly secrets set ${provider.toUpperCase()}_USER_ENC=${encUser} --app bestvpnserver-probe`,
    );
    await exec(
      `fly secrets set ${provider.toUpperCase()}_PASS_ENC=${encPass} --app bestvpnserver-probe`,
    );
  }
}
```

---

## 3. API Authentication

### Probe → API Communication

```typescript
// lib/auth/probe-signature.ts
import { createHmac, timingSafeEqual } from "crypto";

export function signProbePayload(payload: object, secret: string): string {
  const data = JSON.stringify(payload);
  const hmac = createHmac("sha256", secret);
  hmac.update(data);
  return hmac.digest("hex");
}

export function verifyProbeSignature(
  payload: object,
  signature: string | null,
  secret: string = process.env.PROBE_WEBHOOK_SECRET!,
): boolean {
  if (!signature) return false;

  const expected = signProbePayload(payload, secret);
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (sigBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(sigBuffer, expectedBuffer);
}
```

### Webhook Handler

```typescript
// app/api/webhooks/probe-results/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyProbeSignature } from "@/lib/auth/probe-signature";

const ALLOWED_PROBE_IPS = new Set([
  // Fly.io egress IPs for each region
  // Update when adding new probes
]);

export async function POST(request: NextRequest) {
  // 1. IP allowlist check
  const clientIP = request.headers.get("x-forwarded-for")?.split(",")[0];
  if (
    process.env.NODE_ENV === "production" &&
    !ALLOWED_PROBE_IPS.has(clientIP!)
  ) {
    console.warn(`Rejected probe request from unknown IP: ${clientIP}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Signature verification
  const signature = request.headers.get("x-probe-signature");
  const body = await request.json();

  if (!verifyProbeSignature(body, signature)) {
    console.warn("Invalid probe signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 3. Timestamp check (prevent replay attacks)
  const timestamp = body.timestamp;
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  if (Math.abs(now - timestamp) > maxAge) {
    return NextResponse.json({ error: "Stale request" }, { status: 400 });
  }

  // Process valid request...
  return NextResponse.json({ status: "ok" });
}
```

### Go Client Signing

```go
// internal/reporter/webhook.go
package reporter

import (
    "bytes"
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "net/http"
    "os"
    "time"
)

type ProbeResult struct {
    ServerID   int     `json:"server_id"`
    ProbeID    string  `json:"probe_id"`
    Timestamp  int64   `json:"timestamp"`
    PingMs     int     `json:"ping_ms"`
    DownloadMbps float64 `json:"download_mbps"`
    // ... other fields
}

func Send(webhookURL string, result ProbeResult) error {
    result.Timestamp = time.Now().UnixMilli()

    payload, err := json.Marshal(result)
    if err != nil {
        return err
    }

    signature := sign(payload)

    req, err := http.NewRequest("POST", webhookURL, bytes.NewBuffer(payload))
    if err != nil {
        return err
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-Probe-Signature", signature)
    req.Header.Set("X-Probe-ID", result.ProbeID)

    client := &http.Client{Timeout: 10 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != 200 {
        return fmt.Errorf("webhook failed: %d", resp.StatusCode)
    }

    return nil
}

func sign(payload []byte) string {
    secret := os.Getenv("WEBHOOK_SECRET")
    h := hmac.New(sha256.New, []byte(secret))
    h.Write(payload)
    return hex.EncodeToString(h.Sum(nil))
}
```

---

## 4. Rate Limiting

### API Rate Limits

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

export const rateLimits = {
  // Public API endpoints
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1m"),
    analytics: true,
    prefix: "ratelimit:api",
  }),

  // Diagnostic tools (prevent abuse)
  tools: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1m"),
    analytics: true,
    prefix: "ratelimit:tools",
  }),

  // Probe webhooks (high volume allowed)
  probes: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, "1m"),
    analytics: true,
    prefix: "ratelimit:probes",
  }),
};

// Middleware usage
export async function withRateLimit(
  request: NextRequest,
  limiter: keyof typeof rateLimits,
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const { success, remaining, reset } = await rateLimits[limiter].limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      },
    );
  }

  return null; // Continue
}
```

---

## 5. Input Validation

### API Input Schemas

```typescript
// lib/validation/schemas.ts
import { z } from "zod";

export const ServerQuerySchema = z.object({
  provider: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(50)
    .optional(),
  country: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional(),
  city: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(100)
    .optional(),
  protocol: z
    .enum(["wireguard", "openvpn-udp", "openvpn-tcp", "ikev2"])
    .optional(),
  streaming: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(30)
    .optional(),
  minSpeed: z.coerce.number().min(0).max(10000).optional(),
  maxLatency: z.coerce.number().min(0).max(1000).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const ProbeResultSchema = z.object({
  serverId: z.number().int().positive(),
  probeId: z.string().regex(/^[a-z]{3}$/), // iad, fra, etc.
  timestamp: z.number().int(),
  pingMs: z.number().int().min(0).max(65535),
  downloadMbps: z.number().min(0).max(100000),
  uploadMbps: z.number().min(0).max(100000),
  connectionSuccess: z.boolean(),
  connectionTimeMs: z.number().int().min(0).optional(),
  streamingResults: z
    .array(
      z.object({
        platform: z.string(),
        isUnlocked: z.boolean(),
        responseMs: z.number().int().optional(),
      }),
    )
    .optional(),
});
```

### SQL Injection Prevention

```typescript
// Always use parameterized queries with Drizzle
// NEVER concatenate user input into SQL

// Good
const servers = await db.query.servers.findMany({
  where: (s, { eq, and }) =>
    and(eq(s.providerId, providerId), eq(s.isActive, true)),
});

// Bad - NEVER do this
// const servers = await db.execute(`SELECT * FROM servers WHERE provider = '${userInput}'`);
```

---

## 6. Client-Side Security

### WebRTC Leak Test Security

```typescript
// components/tools/webrtc-leak-test.tsx
'use client';

// All processing happens client-side
// No IP addresses sent to server

export function WebRTCLeakTest() {
  const [localIPs, setLocalIPs] = useState<string[]>([]);

  async function detectWebRTCLeak() {
    const ips: string[] = [];

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.createDataChannel('');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.candidate;
        const ipMatch = candidate.match(/(\d{1,3}\.){3}\d{1,3}/);
        if (ipMatch && !ips.includes(ipMatch[0])) {
          ips.push(ipMatch[0]);
          setLocalIPs([...ips]);
        }
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Cleanup after 5 seconds
    setTimeout(() => pc.close(), 5000);
  }

  // IPs are ONLY displayed to user
  // Never transmitted to server
  return (/* UI */);
}
```

### DNS Leak Test Architecture

```
User Browser                    Our DNS Server              Our API
     │                               │                         │
     │ 1. Request unique subdomain   │                         │
     │    uuid-xxx.test.bestvpnserver.com                      │
     │──────────────────────────────▶│                         │
     │                               │                         │
     │                               │ 2. Log resolver IP      │
     │                               │────────────────────────▶│
     │                               │                         │
     │ 3. Fetch results              │                         │
     │────────────────────────────────────────────────────────▶│
     │                               │                         │
     │ 4. Display resolver IPs       │                         │
     │◀────────────────────────────────────────────────────────│
```

```typescript
// app/api/dns-leak-test/route.ts
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  // Generate unique test ID
  const testId = uuidv4();

  // Store test session (expires in 60 seconds)
  await redis.set(
    `dnstest:${testId}`,
    JSON.stringify({
      created: Date.now(),
      resolvers: [],
    }),
    { ex: 60 },
  );

  return NextResponse.json({
    testId,
    testDomain: `${testId}.test.bestvpnserver.com`,
  });
}

export async function GET(request: NextRequest) {
  const testId = request.nextUrl.searchParams.get("testId");

  const data = await redis.get(`dnstest:${testId}`);
  if (!data) {
    return NextResponse.json({ error: "Test expired" }, { status: 404 });
  }

  const { resolvers } = JSON.parse(data as string);

  // Analyze resolvers
  const leakDetected = resolvers.some((ip: string) => !isVPNResolver(ip));

  return NextResponse.json({
    resolvers,
    leakDetected,
  });
}
```

---

## 7. Infrastructure Hardening

### Vercel Configuration

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

### Cloudflare Workers/Pages Configuration

Apply the same security headers in the worker response or middleware when deploying via OpenNext.

### Content Security Policy

```typescript
// middleware.ts
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires these
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.bestvpnserver.com wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
}
```

### Fly.io Probe Hardening

```dockerfile
# Dockerfile for probes
FROM alpine:3.19

# Run as non-root user
RUN addgroup -S probe && adduser -S probe -G probe

# Install only required packages
RUN apk add --no-cache \
    wireguard-tools \
    openvpn \
    ca-certificates

# Copy binary
COPY --from=builder /app/probe /usr/local/bin/probe
RUN chmod +x /usr/local/bin/probe

# No shell access
RUN rm -rf /bin/sh /bin/ash /bin/bash

# Drop capabilities
USER probe

ENTRYPOINT ["probe"]
```

---

## 8. Monitoring & Alerting

### Security Events to Monitor

```typescript
// lib/security/monitoring.ts
export async function logSecurityEvent(event: {
  type: string;
  severity: "info" | "warning" | "critical";
  details: object;
}) {
  // Log to Sentry or similar
  console.log(`[SECURITY] ${event.severity}: ${event.type}`, event.details);

  if (event.severity === "critical") {
    await sendSlackAlert(event);
  }
}

// Events to track:
// - Failed authentication attempts
// - Rate limit exceeded
// - Invalid probe signatures
// - Unusual traffic patterns
// - Credential rotation events
```

---

## 9. Checklist

### Pre-Launch

- [ ] All secrets in environment variables (not code)
- [ ] VPN credentials encrypted at rest
- [ ] Probe webhook authentication implemented
- [ ] Rate limiting on all API endpoints
- [ ] Input validation with Zod schemas
- [ ] CSP headers configured
- [ ] Security headers on all responses
- [ ] Dependency audit (`npm audit`, `go mod verify`)

### Ongoing

- [ ] Rotate VPN credentials quarterly
- [ ] Rotate API keys monthly
- [ ] Review probe IP allowlist when adding regions
- [ ] Monitor for unusual traffic patterns
- [ ] Update dependencies monthly
- [ ] Penetration testing annually

---

**Version**: 1.0
**Last Updated**: 2026-01-11
