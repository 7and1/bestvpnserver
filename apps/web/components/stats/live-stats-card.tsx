"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsOverview {
  streamingUnlockRate: number;
  avgLatency: number;
  connectionSuccessRate: number;
  lastUpdated: string;
}

interface StatItemProps {
  label: string;
  value: string;
  hint: string;
}

function StatItem({ label, value, hint }: StatItemProps) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-white/70 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function formatLatency(ms: number): string {
  if (ms === 0) return "--";
  return ms + " ms";
}

function formatPercentage(pct: number): string {
  if (pct === 0) return "--";
  return pct.toFixed(1) + "%";
}

function getRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 60) {
    return "Updated " + diffSecs + "s ago";
  }
  if (diffMins < 60) {
    return "Updated " + diffMins + "m ago";
  }
  const diffHours = Math.floor(diffMins / 60);
  return "Updated " + diffHours + "h ago";
}

export function LiveStatsCard() {
  const { data, error, isLoading } = useSWR<StatsOverview>(
    "/api/stats/overview",
    {
      refreshInterval: 30000,
      revalidateOnReconnect: true,
    },
  );

  const relativeTime = useMemo(() => {
    if (!data?.lastUpdated) return null;
    return getRelativeTime(data.lastUpdated);
  }, [data?.lastUpdated]);

  if (error) {
    return (
      <Card className="border-foreground/10 bg-white/85">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Live Status
              </div>
              <div className="mt-2 text-2xl font-semibold">
                Network health overview
              </div>
            </div>
            <Badge variant="destructive" className="rounded-full">
              Error loading stats
            </Badge>
          </div>
          <div className="mt-6 text-sm text-muted-foreground">
            Unable to load live statistics. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card className="border-foreground/10 bg-white/85">
        <CardContent className="p-6" role="status" aria-live="polite" aria-label="Loading live statistics">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" aria-hidden="true" />
              <Skeleton className="h-8 w-56" aria-hidden="true" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" aria-hidden="true" />
          </div>
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" aria-hidden="true" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-foreground/10 bg-white/85">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Live Status
            </div>
            <div className="mt-2 text-2xl font-semibold">
              Network health overview
            </div>
          </div>
          <Badge variant="success" className="rounded-full flex items-center gap-1.5">
            <Activity className="h-3 w-3 animate-pulse" />
            {relativeTime}
          </Badge>
        </div>
        <div className="mt-6 space-y-4">
          <StatItem
            label="Streaming unlocks"
            value={formatPercentage(data.streamingUnlockRate)}
            hint="Netflix, Disney+, Max"
          />
          <StatItem
            label="Average latency"
            value={formatLatency(data.avgLatency)}
            hint="Global median"
          />
          <StatItem
            label="Connection success"
            value={formatPercentage(data.connectionSuccessRate)}
            hint="Last 24 hours"
          />
        </div>
      </CardContent>
    </Card>
  );
}
