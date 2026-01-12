"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
      const startRes = await fetch("/api/tools/dns-test/start", {
        method: "POST",
      });
      const { testId, testDomains } = await startRes.json();

      const promises = testDomains.map(
        (domain: string) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = `https://${domain}/pixel.gif?t=${Date.now()}`;
          }),
      );

      await Promise.all(promises);
      await new Promise((r) => setTimeout(r, 2000));

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
      <h2 className="text-2xl font-semibold">DNS Leak Test</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        DNS leaks happen when your DNS requests bypass your VPN. This test
        verifies whether DNS queries stay within the VPN tunnel.
      </p>

      <div className="mt-4">
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
      </div>

      {result && (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            {result.hasLeak ? (
              <Badge variant="destructive">DNS Leak Detected</Badge>
            ) : (
              <Badge variant="success">No DNS Leak</Badge>
            )}
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {result.recommendation}
          </p>

          {result.resolvers.length > 0 && (
            <div className="mt-4 space-y-2">
              {result.resolvers.map((resolver, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border/60 p-3"
                >
                  <code className="text-sm">{resolver.ip}</code>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {resolver.provider}
                    </span>
                    <Badge variant={resolver.isVPN ? "success" : "outline"}>
                      {resolver.isVPN ? "VPN DNS" : "ISP"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
