import Link from "next/link";
import { ArrowUpRight, Globe2, Radar, ShieldCheck, Zap } from "lucide-react";

import { ProviderHighlights } from "@/components/providers/provider-highlights";
import { ServerTable } from "@/components/server-table/server-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function MarketingHome() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f4ef]">
      <div className="pointer-events-none absolute -top-40 right-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(19,84,122,0.35),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute bottom-[-280px] left-[-120px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,196,120,0.35),transparent_70%)] blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
            BV
          </span>
          <div>
            <div className="text-base font-semibold tracking-tight">
              BestVPNServer
            </div>
            <div className="text-xs text-muted-foreground">
              Lighthouse Monitor
            </div>
          </div>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <Link href="#live">Live Data</Link>
          <Link href="#features">Platform</Link>
          <Link href="/tools">Tools</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/tools">Run Diagnostics</Link>
          </Button>
          <Button asChild>
            <Link href="#live">
              Explore Servers <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 px-6 pb-24 pt-10 md:px-12">
        <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Badge variant="secondary" className="rounded-full px-4 py-1">
              Real-time VPN intelligence
            </Badge>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-foreground md:text-6xl">
              Monitor VPN performance with live, city-level telemetry.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground md:text-xl">
              BestVPNServer.com combines distributed probes, streaming unlock
              checks, and programmatic SEO to deliver transparent VPN rankings
              you can trust.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="#live">View live rankings</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/tools">Test your VPN</Link>
              </Button>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Global probes", value: "8 regions", icon: Radar },
                { label: "Servers tracked", value: "50k+", icon: Globe2 },
                { label: "Measurements/day", value: "80k", icon: Zap },
              ].map((stat) => (
                <Card key={stat.label} className="border-border/40 bg-white/70">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                      <stat.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-lg font-semibold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">
                        {stat.label}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="border-border/40 bg-white/80">
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
                <Badge variant="success" className="rounded-full">
                  Updated 5m ago
                </Badge>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  {
                    label: "Streaming unlocks",
                    value: "92%",
                    hint: "Netflix, Disney+, Max",
                  },
                  {
                    label: "Average latency",
                    value: "38 ms",
                    hint: "Global median",
                  },
                  {
                    label: "Connection success",
                    value: "98.4%",
                    hint: "Last 24 hours",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-muted/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-sm font-semibold">
                        {item.value}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.hint}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="mt-20">
          <ProviderHighlights
            title="Top VPN providers this hour"
            subtitle="Ranked by live download throughput and uptime across monitored servers."
            ctaLabel="View full leaderboard"
            ctaHref="/servers"
          />
        </div>

        <section id="live" className="mt-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold">
                Live server leaderboard
              </h2>
              <p className="mt-2 text-muted-foreground">
                Data from probes across 8 regions, updated every 5 minutes.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/servers">Browse all locations</Link>
            </Button>
          </div>
          <div className="mt-8">
            <ServerTable />
          </div>
        </section>

        <section id="features" className="mt-24">
          <div className="grid gap-8 lg:grid-cols-3">
            {[
              {
                title: "Probe-grade telemetry",
                description:
                  "Fly.io probes test VPN endpoints with real devices, measuring latency, speed, and packet loss.",
              },
              {
                title: "Streaming verification",
                description:
                  "Every region checks unlock status for Netflix, Disney+, Max, and more—no guesses.",
              },
              {
                title: "Security-first stack",
                description:
                  "Signed probe payloads, strict input validation, and multi-layered caching keep data clean.",
              },
            ].map((feature) => (
              <Card
                key={feature.title}
                className="border-border/40 bg-white/70"
              >
                <CardContent className="p-6">
                  <ShieldCheck className="h-6 w-6" />
                  <h3 className="mt-4 text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
