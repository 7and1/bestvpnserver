"use client";

import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

        const ipv4Match = candidate.match(/(\d{1,3}\.){3}\d{1,3}/);
        if (ipv4Match && !seenIPs.has(ipv4Match[0])) {
          const ip = ipv4Match[0];
          seenIPs.add(ip);
          ips.push({
            ip,
            type: isPrivateIP(ip) ? "local" : "public",
          });
          setResults([...ips]);
        }

        const ipv6Match = candidate.match(/([a-f0-9:]+:+)+[a-f0-9]+/i);
        if (ipv6Match && !seenIPs.has(ipv6Match[0])) {
          const ip = ipv6Match[0];
          seenIPs.add(ip);
          ips.push({ ip, type: "ipv6" });
          setResults([...ips]);
        }
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await new Promise((resolve) => setTimeout(resolve, 3000));
    pc.close();
    setTesting(false);
  }, []);

  const hasLeak = results.some((r) => r.type === "public" && r.ip !== vpnIP);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold">WebRTC Leak Test</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        WebRTC can reveal your real IP even when using a VPN. This test checks
        if your browser leaks it.
      </p>

      <div className="mt-4">
        <Button onClick={runTest} disabled={testing}>
          {testing ? "Testing..." : "Run Test"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            {hasLeak ? (
              <Badge variant="destructive">Leak Detected</Badge>
            ) : (
              <Badge variant="success">No Leak</Badge>
            )}
          </div>

          {vpnIP && (
            <div className="mt-3 text-sm text-muted-foreground">
              Expected VPN IP:{" "}
              <code className="ml-2 rounded bg-muted px-2 py-1">{vpnIP}</code>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {results.map((result, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border/60 p-3"
              >
                <code className="text-sm">{result.ip}</code>
                <Badge variant="outline">{result.type}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-muted/50 p-4">
        <h3 className="text-sm font-semibold">How to fix WebRTC leaks</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>Use a VPN with built-in WebRTC protection.</li>
          <li>Disable WebRTC in your browser settings.</li>
          <li>Use privacy extensions like uBlock Origin.</li>
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
