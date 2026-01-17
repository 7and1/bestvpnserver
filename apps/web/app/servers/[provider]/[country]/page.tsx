import Link from "next/link";
import { notFound } from "next/navigation";

import { ServerTable } from "@/components/server-table/server-table";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProviderCountryPageData } from "@/lib/data/seo-pages";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/pseo/schema";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

function formatMetric(value: number | null, suffix: string, digits = 1) {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(digits)} ${suffix}`;
}

export async function generateMetadata({
  params,
}: {
  params: { provider: string; country: string };
}) {
  const data = await getProviderCountryPageData(
    params.provider,
    params.country,
  );

  if (!data) {
    return {
      title: `${params.provider} VPN Servers in ${params.country.toUpperCase()}`,
      description: `Live VPN performance data for ${params.provider} in ${params.country.toUpperCase()}.`,
    };
  }

  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical: `${SITE_URL}/servers/${data.data.provider.slug}/${data.data.country.code.toLowerCase()}`,
    },
  };
}

export default async function ProviderCountryPage({
  params,
}: {
  params: { provider: string; country: string };
}) {
  const data = await getProviderCountryPageData(
    params.provider,
    params.country,
  );
  if (!data) notFound();

  const { provider, country, topCities } = data.data;
  const breadcrumbs = [
    { label: "Servers", href: "/servers" },
    { label: provider.name, href: `/servers/${provider.slug}` },
    {
      label: country.name,
      href: `/servers/${provider.slug}/${country.code.toLowerCase()}`,
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      buildWebPageSchema({
        name: data.title,
        description: data.description,
        url: `/servers/${provider.slug}/${country.code.toLowerCase()}`,
      }),
      buildBreadcrumbSchema(breadcrumbs),
    ],
  };

  return (
    <div className="min-h-screen bg-background px-6 py-12 md:px-12">
      <JsonLd data={schema} />
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="space-y-3">
          <Badge variant="secondary" className="rounded-full px-4 py-1">
            Country view
          </Badge>
          <h1 className="text-4xl font-semibold">
            {provider.name} VPN Servers in {country.name}
          </h1>
          <p className="text-muted-foreground">{data.description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Servers
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {data.stats.serverCount.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Avg download
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {formatMetric(data.stats.avgDownload, "Mbps")}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Avg latency
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {formatMetric(data.stats.avgPing, "ms", 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="bg-white/80">
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Top cities</div>
              <div className="mt-4 space-y-3">
                {topCities.map((city) => (
                  <Link
                    key={city.slug}
                    href={`/servers/${provider.slug}/${country.code.toLowerCase()}/${city.slug}`}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-white/60 px-4 py-3 text-sm transition hover:bg-white"
                  >
                    <span className="font-medium">{city.name}</span>
                    <span className="text-muted-foreground">
                      {city.serverCount} servers ·{" "}
                      {formatMetric(city.avgDownload, "Mbps")}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80">
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Browse more</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Explore the full provider overview or jump to another country.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Button variant="outline" asChild>
                  <Link href={`/servers/${provider.slug}`}>
                    View {provider.name} overview
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/servers">All providers</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Live server performance</h2>
          <div className="mt-6">
            <ServerTable
              query={{
                provider: provider.slug,
                country: country.code,
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
