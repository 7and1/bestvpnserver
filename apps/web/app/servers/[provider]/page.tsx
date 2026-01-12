import Link from "next/link";
import { notFound } from "next/navigation";

import { ServerTable } from "@/components/server-table/server-table";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProviderPageData } from "@/lib/data/seo-pages";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/pseo/schema";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

function formatMetric(value: number | null, suffix: string, digits = 1) {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(digits)} ${suffix}`;
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)}%`;
}

export async function generateMetadata({
  params,
}: {
  params: { provider: string };
}) {
  const data = await getProviderPageData(params.provider);
  if (!data) {
    return {
      title: `${params.provider} VPN Servers`,
      description: `Live performance data for ${params.provider} VPN servers.`,
    };
  }

  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical: `${SITE_URL}/servers/${data.data.provider.slug}`,
    },
  };
}

export default async function ProviderPage({
  params,
}: {
  params: { provider: string };
}) {
  const data = await getProviderPageData(params.provider);
  if (!data) notFound();

  const { provider, topCountries } = data.data;
  const breadcrumbs = [
    { label: "Servers", href: "/servers" },
    { label: provider.name, href: `/servers/${provider.slug}` },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      buildWebPageSchema({
        name: data.title,
        description: data.description,
        url: `/servers/${provider.slug}`,
      }),
      buildBreadcrumbSchema(breadcrumbs),
    ],
  };

  return (
    <div className="min-h-screen bg-[#f7f4ef] px-6 py-12 md:px-12">
      <JsonLd data={schema} />
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="secondary" className="rounded-full px-4 py-1">
              Live provider overview
            </Badge>
            <h1 className="mt-4 text-4xl font-semibold">
              {provider.name} VPN Servers
            </h1>
            <p className="mt-3 text-muted-foreground">{data.description}</p>
          </div>
          {provider.affiliateLink && (
            <Button asChild>
              <Link href={`/go/${provider.slug}`}>Get {provider.name}</Link>
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Servers monitored
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {provider.serverCount.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Countries
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {provider.countryCount.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Avg download
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {formatMetric(provider.avgDownload, "Mbps")}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Uptime
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {formatPercent(provider.uptimePct)}
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="bg-white/80">
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Top countries</div>
              <div className="mt-4 space-y-3">
                {topCountries.map((country) => (
                  <Link
                    key={country.code}
                    href={`/servers/${provider.slug}/${country.code.toLowerCase()}`}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-white/60 px-4 py-3 text-sm transition hover:bg-white"
                  >
                    <span className="font-medium">{country.name}</span>
                    <span className="text-muted-foreground">
                      {country.serverCount} servers ·{" "}
                      {formatMetric(country.avgDownload, "Mbps")}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80">
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Latest measurement</div>
              <div className="mt-4 text-sm text-muted-foreground">
                {data.lastUpdated
                  ? new Date(data.lastUpdated).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Awaiting latest probe run"}
              </div>
              <div className="mt-6">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Avg latency
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {formatMetric(provider.avgPing, "ms", 0)}
                </div>
              </div>
              <div className="mt-6 text-xs text-muted-foreground">
                Data is refreshed every 5 minutes from global probes.
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Live performance table</h2>
            <Button variant="outline" asChild>
              <Link href="/servers">Browse all providers</Link>
            </Button>
          </div>
          <div className="mt-6">
            <ServerTable query={{ provider: provider.slug }} />
          </div>
        </section>
      </div>
    </div>
  );
}
