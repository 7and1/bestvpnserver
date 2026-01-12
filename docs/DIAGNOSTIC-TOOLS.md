# Diagnostic Tools - BestVPNServer.com

## Overview

Client-side security and performance testing tools to increase user engagement and trust.

---

## 1. Tools Overview

| Tool             | Purpose                      | Implementation          |
| ---------------- | ---------------------------- | ----------------------- |
| WebRTC Leak Test | Detect IP leaks via WebRTC   | Client-side JavaScript  |
| DNS Leak Test    | Detect DNS resolver leaks    | Custom DNS server       |
| IP Lookup        | Show current IP and location | Server-side GeoIP       |
| Speed Test       | Test connection speed        | LibreSpeed / Cloudflare |

---

## 2. WebRTC Leak Test

### How It Works

WebRTC can reveal local and public IPs even when using a VPN. This tool detects those leaks.

```
Browser WebRTC API
       │
       │ RTCPeerConnection
       │ ICE Candidate gathering
       ▼
┌──────────────────┐
│  STUN Server     │  ← stun.l.google.com:19302
└──────────────────┘
       │
       │ Returns IP addresses
       ▼
┌──────────────────┐
│  Display to User │  ← Compare with VPN IP
└──────────────────┘
```

### Implementation

```tsx
// components/tools/webrtc-leak-test.tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IPResult {
  ip: string;
  type: "local" | "public" | "ipv6";
}

export function WebRTCLeakTest() {
  const [results, setResults] = useState<IPResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [vpnIP, setVpnIP] = useState<string | null>(null);

  const runTest = useCallback(async () => {
    setTesting(true);
    setResults([]);

    // First, get the expected VPN IP
    const ipResponse = await fetch("/api/tools/my-ip");
    const { ip } = await ipResponse.json();
    setVpnIP(ip);

    const ips: IPResult[] = [];
    const seenIPs = new Set<string>();

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.createDataChannel("");

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.candidate;

        // Extract IPv4
        const ipv4Match = candidate.match(/(\d{1,3}\.){3}\d{1,3}/);
        if (ipv4Match && !seenIPs.has(ipv4Match[0])) {
          seenIPs.add(ipv4Match[0]);
          const ip = ipv4Match[0];
          ips.push({
            ip,
            type: isPrivateIP(ip) ? "local" : "public",
          });
          setResults([...ips]);
        }

        // Extract IPv6
        const ipv6Match = candidate.match(/([a-f0-9:]+:+)+[a-f0-9]+/i);
        if (ipv6Match && !seenIPs.has(ipv6Match[0])) {
          seenIPs.add(ipv6Match[0]);
          ips.push({
            ip: ipv6Match[0],
            type: "ipv6",
          });
          setResults([...ips]);
        }
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering
    await new Promise((resolve) => setTimeout(resolve, 3000));
    pc.close();
    setTesting(false);
  }, []);

  const hasLeak = results.some((r) => r.type === "public" && r.ip !== vpnIP);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">WebRTC Leak Test</h2>

      <p className="text-muted-foreground mb-4">
        WebRTC can reveal your real IP address even when using a VPN. This test
        checks if your browser is leaking your IP.
      </p>

      <Button onClick={runTest} disabled={testing}>
        {testing ? "Testing..." : "Run Test"}
      </Button>

      {results.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-medium">Status:</span>
            {hasLeak ? (
              <Badge variant="destructive">Leak Detected!</Badge>
            ) : (
              <Badge variant="success">No Leak</Badge>
            )}
          </div>

          {vpnIP && (
            <div className="mb-4">
              <span className="text-sm text-muted-foreground">
                Expected VPN IP:
              </span>
              <code className="ml-2 px-2 py-1 bg-muted rounded">{vpnIP}</code>
            </div>
          )}

          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">IP Address</th>
                <th className="text-left">Type</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, i) => (
                <tr key={i}>
                  <td>
                    <code>{result.ip}</code>
                  </td>
                  <td>
                    <Badge variant="outline">{result.type}</Badge>
                  </td>
                  <td>
                    {result.type === "local" ? (
                      <span className="text-muted-foreground">Normal</span>
                    ) : result.ip === vpnIP ? (
                      <span className="text-green-600">VPN IP</span>
                    ) : (
                      <span className="text-red-600">Real IP Leaked!</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">How to fix WebRTC leaks:</h3>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>Use a VPN with built-in WebRTC protection</li>
          <li>Disable WebRTC in browser settings</li>
          <li>Use browser extensions like uBlock Origin</li>
          <li>
            Firefox: Set media.peerconnection.enabled to false in about:config
          </li>
        </ul>
      </div>
    </Card>
  );
}

function isPrivateIP(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 127
  );
}
```

---

## 3. DNS Leak Test

### Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  User Browser    │     │  Our DNS Server  │     │  Our API         │
│                  │     │  (CoreDNS)       │     │                  │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         │ 1. GET /api/dns-test/start                      │
         │─────────────────────────────────────────────────▶│
         │                        │                        │
         │ 2. Returns testId + unique subdomain            │
         │◀─────────────────────────────────────────────────│
         │                        │                        │
         │ 3. Browser resolves    │                        │
         │    {testId}.test.bestvpnserver.com              │
         │───────────────────────▶│                        │
         │                        │                        │
         │                        │ 4. Logs resolver IP    │
         │                        │────────────────────────▶│
         │                        │                        │
         │ 5. GET /api/dns-test/results?testId=xxx         │
         │─────────────────────────────────────────────────▶│
         │                        │                        │
         │ 6. Returns resolver IPs + leak status           │
         │◀─────────────────────────────────────────────────│
```

### API Endpoints

```typescript
// app/api/tools/dns-test/start/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";

export async function POST() {
  const testId = nanoid(12);

  // Store test session
  await redis.set(
    `dnstest:${testId}`,
    JSON.stringify({
      created: Date.now(),
      resolvers: [],
    }),
    { ex: 120 }, // 2 minute expiry
  );

  return NextResponse.json({
    testId,
    testDomains: [
      `${testId}-1.test.bestvpnserver.com`,
      `${testId}-2.test.bestvpnserver.com`,
      `${testId}-3.test.bestvpnserver.com`,
    ],
  });
}
```

```typescript
// app/api/tools/dns-test/results/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// Known VPN DNS resolver ranges
const VPN_RESOLVERS: Record<string, string[]> = {
  nordvpn: ["103.86.96.0/22", "103.86.99.0/24"],
  expressvpn: ["198.54.128.0/24"],
  surfshark: ["162.252.172.0/24"],
  // ... more providers
};

export async function GET(request: NextRequest) {
  const testId = request.nextUrl.searchParams.get("testId");

  if (!testId) {
    return NextResponse.json({ error: "Missing testId" }, { status: 400 });
  }

  const data = await redis.get<string>(`dnstest:${testId}`);
  if (!data) {
    return NextResponse.json(
      { error: "Test expired or not found" },
      { status: 404 },
    );
  }

  const { resolvers } = JSON.parse(data);

  // Analyze resolvers
  const analysis = resolvers.map((resolver: string) => ({
    ip: resolver,
    provider: identifyProvider(resolver),
    isVPN: isVPNResolver(resolver),
  }));

  const hasLeak = analysis.some((r: any) => !r.isVPN);

  return NextResponse.json({
    testId,
    resolvers: analysis,
    hasLeak,
    recommendation: hasLeak
      ? "Your DNS requests are not going through your VPN. Configure your VPN to use its own DNS servers."
      : "Your DNS requests are properly routed through your VPN.",
  });
}

function identifyProvider(ip: string): string {
  // GeoIP lookup for ISP name
  // This would use MaxMind or similar
  return "Unknown";
}

function isVPNResolver(ip: string): boolean {
  // Check against known VPN resolver ranges
  for (const ranges of Object.values(VPN_RESOLVERS)) {
    for (const range of ranges) {
      if (isIPInRange(ip, range)) return true;
    }
  }
  return false;
}
```

### DNS Server (CoreDNS)

```
# Corefile
test.bestvpnserver.com:53 {
    log
    forward . 8.8.8.8

    # Custom plugin to log resolver IPs
    webhook {
        url https://bestvpnserver.com/api/tools/dns-test/log
        secret {$WEBHOOK_SECRET}
    }
}
```

### Frontend Component

```tsx
// components/tools/dns-leak-test.tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Resolver {
  ip: string;
  provider: string;
  isVPN: boolean;
}

interface TestResult {
  testId: string;
  resolvers: Resolver[];
  hasLeak: boolean;
  recommendation: string;
}

export function DNSLeakTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = useCallback(async () => {
    setTesting(true);
    setResult(null);

    try {
      // 1. Start test
      const startRes = await fetch("/api/tools/dns-test/start", {
        method: "POST",
      });
      const { testId, testDomains } = await startRes.json();

      // 2. Trigger DNS lookups by loading images from test domains
      const promises = testDomains.map(
        (domain: string) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Still resolve on error
            img.src = `https://${domain}/pixel.gif?t=${Date.now()}`;
          }),
      );

      await Promise.all(promises);

      // 3. Wait for DNS logs to propagate
      await new Promise((r) => setTimeout(r, 2000));

      // 4. Get results
      const resultRes = await fetch(
        `/api/tools/dns-test/results?testId=${testId}`,
      );
      const data = await resultRes.json();

      setResult(data);
    } catch (error) {
      console.error("DNS leak test failed:", error);
    } finally {
      setTesting(false);
    }
  }, []);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">DNS Leak Test</h2>

      <p className="text-muted-foreground mb-4">
        DNS leaks occur when your DNS queries bypass your VPN and go through
        your ISP's DNS servers, potentially exposing your browsing activity.
      </p>

      <Button onClick={runTest} disabled={testing}>
        {testing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Testing DNS...
          </>
        ) : (
          "Run Test"
        )}
      </Button>

      {result && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-medium">Status:</span>
            {result.hasLeak ? (
              <Badge variant="destructive">DNS Leak Detected!</Badge>
            ) : (
              <Badge variant="success">No DNS Leak</Badge>
            )}
          </div>

          <p className="text-sm mb-4">{result.recommendation}</p>

          {result.resolvers.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">DNS Resolvers Detected:</h3>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">IP Address</th>
                    <th className="text-left">Provider</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.resolvers.map((resolver, i) => (
                    <tr key={i}>
                      <td>
                        <code>{resolver.ip}</code>
                      </td>
                      <td>{resolver.provider}</td>
                      <td>
                        {resolver.isVPN ? (
                          <span className="text-green-600">VPN DNS</span>
                        ) : (
                          <span className="text-red-600">
                            ISP/Third-party DNS
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
```

---

## 4. IP Lookup Tool

### API Endpoint

```typescript
// app/api/tools/my-ip/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

// Using MaxMind GeoLite2 or similar
import { Reader } from "@maxmind/geoip2-node";

let geoReader: Reader | null = null;

async function getGeoReader() {
  if (!geoReader) {
    geoReader = await Reader.open("/path/to/GeoLite2-City.mmdb");
  }
  return geoReader;
}

export async function GET(request: NextRequest) {
  const headersList = headers();

  // Get client IP (handle proxies)
  const forwardedFor = headersList.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0].trim() ||
    headersList.get("x-real-ip") ||
    request.ip ||
    "Unknown";

  // Get geo data
  let geoData = null;
  try {
    const reader = await getGeoReader();
    const response = reader.city(ip);

    geoData = {
      country: response.country?.names?.en,
      countryCode: response.country?.isoCode,
      city: response.city?.names?.en,
      region: response.subdivisions?.[0]?.names?.en,
      latitude: response.location?.latitude,
      longitude: response.location?.longitude,
      timezone: response.location?.timeZone,
      isp: response.traits?.isp,
      organization: response.traits?.organization,
    };
  } catch (error) {
    // IP not found in database
  }

  // Check if IP belongs to known VPN/datacenter
  const isVPN = await checkIfVPN(ip);

  return NextResponse.json({
    ip,
    geo: geoData,
    isVPN,
    headers: {
      userAgent: headersList.get("user-agent"),
      acceptLanguage: headersList.get("accept-language"),
    },
  });
}

async function checkIfVPN(ip: string): Promise<boolean> {
  // Check against known VPN/datacenter IP ranges
  // Could use services like IP2Location or maintain own database
  return false;
}
```

### Frontend Component

```tsx
// components/tools/ip-lookup.tsx
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Building, Clock } from "lucide-react";

interface IPInfo {
  ip: string;
  geo: {
    country: string;
    countryCode: string;
    city: string;
    region: string;
    latitude: number;
    longitude: number;
    timezone: string;
    isp: string;
    organization: string;
  } | null;
  isVPN: boolean;
}

export function IPLookup() {
  const [info, setInfo] = useState<IPInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tools/my-ip")
      .then((res) => res.json())
      .then(setInfo)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </Card>
    );
  }

  if (!info) return null;

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Your IP Address</h2>

      <div className="flex items-center gap-4 mb-6">
        <code className="text-3xl font-mono">{info.ip}</code>
        {info.isVPN && <Badge variant="success">VPN Detected</Badge>}
      </div>

      {info.geo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium">Location</div>
              <div className="text-muted-foreground">
                {info.geo.city}, {info.geo.region}
              </div>
              <div className="text-muted-foreground">{info.geo.country}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium">Coordinates</div>
              <div className="text-muted-foreground">
                {info.geo.latitude?.toFixed(4)},{" "}
                {info.geo.longitude?.toFixed(4)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium">ISP / Organization</div>
              <div className="text-muted-foreground">
                {info.geo.isp || info.geo.organization || "Unknown"}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium">Timezone</div>
              <div className="text-muted-foreground">{info.geo.timezone}</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
```

---

## 5. Speed Test

### Option A: LibreSpeed Self-Hosted

```typescript
// app/api/tools/speedtest/download/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const size = parseInt(request.nextUrl.searchParams.get("size") || "1000000");
  const maxSize = 100 * 1024 * 1024; // 100MB max

  const actualSize = Math.min(size, maxSize);

  // Generate random data
  const data = Buffer.alloc(actualSize);

  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": actualSize.toString(),
      "Cache-Control": "no-store",
    },
  });
}
```

```typescript
// app/api/tools/speedtest/upload/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Consume the body
  const body = await request.arrayBuffer();
  const size = body.byteLength;

  const duration = Date.now() - startTime;

  return NextResponse.json({
    size,
    duration,
    speed: (size * 8) / (duration / 1000) / 1000000, // Mbps
  });
}
```

### Option B: Cloudflare Speed Test Integration

```tsx
// components/tools/speed-test.tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SpeedResult {
  download: number;
  upload: number;
  latency: number;
}

export function SpeedTest() {
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<
    "idle" | "latency" | "download" | "upload"
  >("idle");
  const [result, setResult] = useState<SpeedResult | null>(null);

  const runTest = useCallback(async () => {
    setTesting(true);
    setResult(null);

    const results: SpeedResult = { download: 0, upload: 0, latency: 0 };

    // 1. Latency test
    setPhase("latency");
    setProgress(10);

    const latencies: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      await fetch("/api/tools/speedtest/ping", { cache: "no-store" });
      latencies.push(performance.now() - start);
    }
    results.latency = Math.min(...latencies);
    setProgress(20);

    // 2. Download test
    setPhase("download");
    const downloadSizes = [1, 5, 10, 25].map((mb) => mb * 1024 * 1024);
    let totalDownloadBytes = 0;
    let totalDownloadTime = 0;

    for (let i = 0; i < downloadSizes.length; i++) {
      const size = downloadSizes[i];
      const start = performance.now();

      const response = await fetch(
        `/api/tools/speedtest/download?size=${size}`,
        {
          cache: "no-store",
        },
      );
      await response.arrayBuffer();

      totalDownloadTime += performance.now() - start;
      totalDownloadBytes += size;

      setProgress(20 + ((i + 1) / downloadSizes.length) * 40);
    }

    results.download =
      (totalDownloadBytes * 8) / (totalDownloadTime / 1000) / 1000000;
    setProgress(60);

    // 3. Upload test
    setPhase("upload");
    const uploadSizes = [0.5, 1, 2, 5].map((mb) => mb * 1024 * 1024);
    let totalUploadBytes = 0;
    let totalUploadTime = 0;

    for (let i = 0; i < uploadSizes.length; i++) {
      const size = uploadSizes[i];
      const data = new ArrayBuffer(size);
      const start = performance.now();

      await fetch("/api/tools/speedtest/upload", {
        method: "POST",
        body: data,
      });

      totalUploadTime += performance.now() - start;
      totalUploadBytes += size;

      setProgress(60 + ((i + 1) / uploadSizes.length) * 40);
    }

    results.upload =
      (totalUploadBytes * 8) / (totalUploadTime / 1000) / 1000000;

    setResult(results);
    setPhase("idle");
    setTesting(false);
  }, []);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Speed Test</h2>

      <p className="text-muted-foreground mb-4">
        Test your current connection speed to see how your VPN affects
        performance.
      </p>

      {!testing && !result && (
        <Button onClick={runTest} size="lg">
          Start Speed Test
        </Button>
      )}

      {testing && (
        <div className="space-y-4">
          <Progress value={progress} />
          <p className="text-center text-muted-foreground">
            {phase === "latency" && "Testing latency..."}
            {phase === "download" && "Testing download speed..."}
            {phase === "upload" && "Testing upload speed..."}
          </p>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-3 gap-6 mt-6">
          <div className="text-center">
            <div className="text-4xl font-bold">
              {result.latency.toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground">ms Latency</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold">
              {result.download.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">Mbps Download</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold">{result.upload.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">Mbps Upload</div>
          </div>
        </div>
      )}

      {result && (
        <Button onClick={runTest} variant="outline" className="mt-6">
          Run Again
        </Button>
      )}
    </Card>
  );
}
```

---

## 6. Tools Page Layout

```tsx
// app/(tools)/tools/page.tsx
import { IPLookup } from "@/components/tools/ip-lookup";
import { WebRTCLeakTest } from "@/components/tools/webrtc-leak-test";
import { DNSLeakTest } from "@/components/tools/dns-leak-test";
import { SpeedTest } from "@/components/tools/speed-test";

export const metadata = {
  title: "VPN Security Tools - BestVPNServer",
  description:
    "Free tools to test your VPN connection: WebRTC leak test, DNS leak test, IP lookup, and speed test.",
};

export default function ToolsPage() {
  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-2">VPN Security Tools</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Test your VPN connection for leaks and performance issues.
      </p>

      <div className="grid gap-8">
        <IPLookup />
        <WebRTCLeakTest />
        <DNSLeakTest />
        <SpeedTest />
      </div>
    </div>
  );
}
```

---

**Version**: 1.0
**Last Updated**: 2026-01-11
