"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { swrFetcher } from "@/lib/api/fetcher";

type ProviderHighlight = {
  providerId: number;
  name: string;
  slug: string;
  websiteUrl: string | null;
  affiliateLink: string | null;
  logoUrl: string | null;
  serverCount: number;
  countryCount: number;
  cityCount: number;
  avgPing: number | null;
  avgDownload: number | null;
  avgUpload: number | null;
  uptimePct: number | null;
  lastMeasured: string | null;
  rank: number;
};

function formatMetric(value: number | null, suffix: string, digits = 1) {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(digits)} ${suffix}`;
}

function formatCoverage(countryCount: number, cityCount: number) {
  if (countryCount > 0 && cityCount > 0) {
    return `${countryCount} countries · ${cityCount} cities`;
  }
  if (countryCount > 0) return `${countryCount} countries`;
  if (cityCount > 0) return `${cityCount} cities`;
  return "Coverage data pending";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "-";
  return parsed.toISOString().slice(0, 10);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function ProviderHighlights({
  title,
  subtitle,
  limit = 6,
  ctaLabel = "Explore servers",
  ctaHref = "/servers",
}: {
  title: string;
  subtitle: string;
  limit?: number;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const { data: providers, isLoading } = useSWR<ProviderHighlight[]>(
    `/api/providers/highlights?limit=${limit}`,
    swrFetcher,
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Badge variant="secondary" className="rounded-full px-4 py-1">
            Provider intelligence
          </Badge>
          <h2 className="text-3xl font-semibold">{title}</h2>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="status" aria-live="polite" aria-label="Loading provider highlights">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-foreground/10 bg-white/80">
              <CardContent className="p-6">
                <Skeleton className="mb-4 h-5 w-24" aria-hidden="true" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" aria-hidden="true" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" aria-hidden="true" />
                    <Skeleton className="h-4 w-24" aria-hidden="true" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !providers || providers.length === 0 ? (
        <Card className="border-foreground/10 bg-white/80">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Provider telemetry will appear once probes begin reporting.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider, index) => {
            const isTop = (provider.rank ?? index + 1) === 1;
            return (
              <Card
                key={provider.providerId}
                className={`border-foreground/10 bg-white/80 ${
                  isTop ? "shadow-lg ring-1 ring-primary/30" : ""
                }`}
              >
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Rank #{provider.rank ?? index + 1}
                    </div>
                    <Badge variant="outline">
                      {provider.serverCount} servers
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-xs font-semibold"
                      style={
                        provider.logoUrl
                          ? {
                              backgroundImage: `url(${provider.logoUrl})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                      role="img"
                      aria-label={`${provider.name} logo`}
                    >
                      {!provider.logoUrl && (
                        <span>{getInitials(provider.name)}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        {provider.name}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatCoverage(
                          provider.countryCount,
                          provider.cityCount,
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Avg download {formatMetric(provider.avgDownload, "Mbps")}
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Latency</span>
                      <span className="font-medium">
                        {formatMetric(provider.avgPing, "ms", 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Uptime</span>
                      <span className="font-medium">
                        {provider.uptimePct
                          ? `${provider.uptimePct.toFixed(1)}%`
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last check</span>
                      <span className="font-medium">
                        {formatDate(provider.lastMeasured)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Button asChild>
                      <Link
                        href={
                          provider.affiliateLink
                            ? `/go/${provider.slug}`
                            : `/servers/${provider.slug}`
                        }
                      >
                        {provider.affiliateLink
                          ? `Get ${provider.name}`
                          : "View provider"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
