import Link from "next/link";
import { ArrowUpRight, Globe2, Radar, ShieldCheck, Zap } from "lucide-react";
import type { Metadata } from "next";

import { ProviderHighlights } from "@/components/providers/provider-highlights";
import { ServerTable } from "@/components/server-table/server-table";
import { LiveStatsCard } from "@/components/stats/live-stats-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "BestVPNServer.com - Data-Driven VPN Monitoring with Live Telemetry",
    description:
      "Monitor VPN performance with city-level telemetry. Track 50,000+ servers across 8 global regions with 80,000+ daily measurements. Real-time speed tests, streaming unlocks, and transparent VPN leaderboards.",
    openGraph: {
      title: "BestVPNServer.com - Data-Driven VPN Monitoring with Live Telemetry",
      description:
        "Track 50,000+ VPN servers with real-time performance metrics, speed tests, and streaming unlock verification from global probe telemetry.",
      url: SITE_URL,
      siteName: "BestVPNServer.com",
      images: [
        {
          url: "/og-image.svg",
          width: 1200,
          height: 630,
          alt: "BestVPNServer.com - VPN Performance Monitoring",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "BestVPNServer.com - Data-Driven VPN Monitoring with Live Telemetry",
      description:
        "Track 50,000+ VPN servers with real-time performance metrics, speed tests, and streaming unlock verification from global probe telemetry.",
      images: ["/og-image.svg"],
    },
    alternates: {
      canonical: SITE_URL,
    },
  };
}

export default async function MarketingHome() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -top-32 right-[-120px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(24,109,133,0.35),transparent_65%)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-260px] left-[-160px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(245,157,94,0.35),transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-20 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

      <main className="relative z-10 px-6 pb-24 pt-12 md:px-12">
        <section className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8 motion-safe:animate-fade-in-up">
            <div className="space-y-5">
              <Badge variant="secondary" className="rounded-full px-4 py-1">
                Live VPN intelligence
              </Badge>
              <h1 className="text-4xl font-semibold leading-tight text-foreground md:text-6xl">
                Monitor VPN performance with city-level telemetry.
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl">
                BestVPNServer.com blends distributed probes, streaming unlock
                checks, and ranking automation to surface transparent VPN
                leaderboards you can trust.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="#live">View live rankings</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/tools">Test your VPN</Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Global probes", value: "8 regions", icon: Radar },
                { label: "Servers tracked", value: "50k+", icon: Globe2 },
                { label: "Measurements/day", value: "80k", icon: Zap },
              ].map((stat) => (
                <Card
                  key={stat.label}
                  className="border-foreground/10 bg-white/80"
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
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

          <div
            className="space-y-4 motion-safe:animate-fade-in-up"
            style={{ animationDelay: "120ms" }}
          >
            <LiveStatsCard />

            <Card className="border-foreground/10 bg-white/75">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      Data scope
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      What we verify on every run
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center justify-between">
                    <span>Latency, throughput, jitter</span>
                    <span className="text-foreground">Realtime</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Streaming region unlocks</span>
                    <span className="text-foreground">Hourly</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>ISP and DNS leak analysis</span>
                    <span className="text-foreground">On demand</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="mt-16">
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
                className="border-foreground/10 bg-white/80"
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
