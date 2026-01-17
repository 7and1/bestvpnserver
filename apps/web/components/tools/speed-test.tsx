"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ToolEducation } from "@/components/ui/collapsible";

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

    setPhase("latency");
    setProgress(10);

    const latencies: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const start = performance.now();
      await fetch("/api/tools/speedtest/ping", { cache: "no-store" });
      latencies.push(performance.now() - start);
    }
    results.latency = Math.min(...latencies);
    setProgress(25);

    setPhase("download");
    const downloadSizes = [1, 5, 10, 25].map((mb) => mb * 1024 * 1024);
    let totalDownloadBytes = 0;
    let totalDownloadTime = 0;

    for (const size of downloadSizes) {
      const start = performance.now();
      const response = await fetch(
        `/api/tools/speedtest/download?size=${size}`,
        { cache: "no-store" },
      );
      const buffer = await response.arrayBuffer();
      totalDownloadBytes += buffer.byteLength;
      totalDownloadTime += performance.now() - start;
      setProgress((prev) => Math.min(prev + 15, 70));
    }

    results.download =
      (totalDownloadBytes * 8) / (totalDownloadTime / 1000) / 1_000_000;

    setPhase("upload");
    const uploadPayload = new Uint8Array(5 * 1024 * 1024);
    const uploadStart = performance.now();
    await fetch("/api/tools/speedtest/upload", {
      method: "POST",
      body: uploadPayload,
    });
    const uploadDuration = performance.now() - uploadStart;
    results.upload =
      (uploadPayload.byteLength * 8) / (uploadDuration / 1000) / 1_000_000;

    setProgress(100);
    setResult(results);
    setTesting(false);
    setPhase("idle");
  }, []);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold">Speed Test</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Measure latency, download, and upload speed from your current
        connection.
      </p>

      <div className="mt-4">
        <Button onClick={runTest} disabled={testing}>
          {testing ? "Testing..." : "Run Speed Test"}
        </Button>
      </div>

      {testing && (
        <div className="mt-4 space-y-2" role="status" aria-live="polite">
          <div className="text-sm text-muted-foreground">
            {phase === "latency" && "Measuring latency"}
            {phase === "download" && "Measuring download speed"}
            {phase === "upload" && "Measuring upload speed"}
          </div>
          <Progress value={progress} aria-label={`Speed test progress: ${progress}%`} />
        </div>
      )}

      {result && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border/60 p-4">
            <div className="text-xs text-muted-foreground">Latency</div>
            <div className="text-xl font-semibold">
              {result.latency.toFixed(1)} ms
            </div>
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <div className="text-xs text-muted-foreground">Download</div>
            <div className="text-xl font-semibold">
              {result.download.toFixed(1)} Mbps
            </div>
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <div className="text-xs text-muted-foreground">Upload</div>
            <div className="text-xl font-semibold">
              {result.upload.toFixed(1)} Mbps
            </div>
          </div>
        </div>
      )}

      <ToolEducation>
        <p>
          VPN speed varies significantly based on server location, encryption
          overhead, and your original connection speed. This test measures your
          actual connection speed through the current VPN server to help you
          understand real-world performance.
        </p>
        <p>
          <strong className="text-foreground">Latency</strong> (ping) affects
          gaming and video calls—lower is better.{" "}
          <strong className="text-foreground">Download speed</strong> impacts
          streaming and browsing.{" "}
          <strong className="text-foreground">Upload speed</strong> matters for
          video calls and file sharing.
        </p>
        <p>
          <strong className="text-foreground">What the results mean:</strong> If
          speeds are much slower than your base connection, try connecting to a
          less crowded server or one closer to your physical location. Some
          speed reduction is normal due to encryption routing.
        </p>
      </ToolEducation>
    </Card>
  );
}
