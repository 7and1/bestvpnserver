import { Suspense } from "react";

import { ProviderHighlights } from "@/components/providers/provider-highlights";
import { ProviderHighlightsSkeleton } from "@/components/providers/provider-highlights-skeleton";
import { ServerTable } from "@/components/server-table/server-table";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600;

export const metadata = {
  title: "Best VPN Servers - Live Rankings",
  description: "Live VPN server rankings powered by global probe telemetry.",
};

export default async function ServersIndexPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-12 md:px-12">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="motion-safe:animate-fade-in-up">
          <Badge variant="secondary" className="rounded-full px-4 py-1">
            Live leaderboard
          </Badge>
          <h1 className="mt-4 text-4xl font-semibold">
            Global VPN Server Rankings
          </h1>
          <p className="mt-3 text-muted-foreground">
            Browse the fastest servers ranked by live probe telemetry.
          </p>
        </header>
        <Suspense fallback={<ProviderHighlightsSkeleton count={8} />}>
          <ProviderHighlights
            title="Provider leaderboard"
            subtitle="Live summary of providers ranked by average speed and uptime."
            ctaLabel="Run diagnostics"
            ctaHref="/tools"
            limit={8}
          />
        </Suspense>
        <div className="mt-8">
          <ServerTable />
        </div>
      </div>
    </div>
  );
}
