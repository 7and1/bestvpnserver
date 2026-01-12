import Link from "next/link";
import { notFound } from "next/navigation";

import { ServerTable } from "@/components/server-table/server-table";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProviderCityPageData } from "@/lib/data/seo-pages";
import {
  buildBreadcrumbSchema,
  buildFAQSchema,
  buildServiceSchema,
  buildWebPageSchema,
} from "@/lib/pseo/schema";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

function formatMetric(value: number | null, suffix: string, digits = 1) {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(digits)} ${suffix}`;
}

export async function generateMetadata({
  params,
}: {
  params: { provider: string; country: string; city: string };
}) {
  const data = await getProviderCityPageData(
    params.provider,
    params.country,
    params.city,
  );

  if (!data) {
    const cityName = params.city.replace(/-/g, " ");
    return {
      title: `${params.provider} VPN Servers in ${cityName}`,
      description: `Live VPN performance data for ${params.provider} servers in ${cityName}.`,
    };
  }

  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical: `${SITE_URL}/servers/${data.data.provider.slug}/${data.data.country.code.toLowerCase()}/${data.data.city.slug}`,
    },
  };
}

export default async function ProviderCityPage({
  params,
}: {
  params: { provider: string; country: string; city: string };
}) {
  const data = await getProviderCityPageData(
    params.provider,
    params.country,
    params.city,
  );
  if (!data) notFound();

  const {
    provider,
    country,
    city,
    unlockedServices,
    otherCities,
    competingProviders,
  } = data.data;
  const breadcrumbItems = [
    { label: "Servers", href: "/servers" },
    { label: provider.name, href: `/servers/${provider.slug}` },
    {
      label: country.name,
      href: `/servers/${provider.slug}/${country.code.toLowerCase()}`,
    },
    {
      label: city.name,
      href: `/servers/${provider.slug}/${country.code.toLowerCase()}/${city.slug}`,
    },
  ];

  const faqItems = [
    {
      question: `How fast are ${provider.name} servers in ${city.name}?`,
      answer: `${provider.name} servers in ${city.name} average ${formatMetric(
        data.stats.avgDownload,
        "Mbps",
      )} download and ${formatMetric(data.stats.avgPing, "ms", 0)} latency.`,
    },
    {
      question: `Does ${provider.name} work with Netflix in ${country.name}?`,
      answer: unlockedServices.some((item) =>
        item.slug.toLowerCase().includes("netflix"),
      )
        ? `${provider.name} servers in ${city.name} show recent Netflix unlock results.`
        : `We have not detected recent Netflix unlock signals for ${provider.name} in ${city.name}.`,
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      buildWebPageSchema({
        name: data.title,
        description: data.description,
        url: `/servers/${provider.slug}/${country.code.toLowerCase()}/${city.slug}`,
      }),
      buildBreadcrumbSchema(breadcrumbItems),
      buildServiceSchema({
        providerName: provider.name,
        areaName: `${city.name}, ${country.name}`,
        url: `/servers/${provider.slug}/${country.code.toLowerCase()}/${city.slug}`,
      }),
      buildFAQSchema(faqItems),
    ],
  };

  return (
    <div className="min-h-screen bg-[#f7f4ef] px-6 py-12 md:px-12">
      <JsonLd data={schema} />
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="secondary" className="rounded-full px-4 py-1">
              City telemetry
            </Badge>
            <h1 className="mt-4 text-4xl font-semibold">
              {provider.name} VPN Servers in {city.name}
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
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Streaming unlocks
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {unlockedServices.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="bg-white/80">
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Unlocked services</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {unlockedServices.length > 0 ? (
                  unlockedServices.map((service) => (
                    <Badge key={service.slug} variant="outline">
                      {service.name}
                      {service.region ? ` (${service.region})` : ""}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No recent unlock signals detected.
                  </span>
                )}
              </div>
              <div className="mt-6 text-xs text-muted-foreground">
                Unlock checks refresh every 24 hours.
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80">
            <CardContent className="p-6 space-y-6">
              <div>
                <div className="text-sm font-semibold">Other cities</div>
                <div className="mt-3 space-y-2 text-sm">
                  {otherCities.length > 0 ? (
                    otherCities.map((item) => (
                      <Link
                        key={`${item.countryCode}-${item.slug}`}
                        href={`/servers/${provider.slug}/${item.countryCode}/${item.slug}`}
                        className="block text-muted-foreground hover:text-foreground"
                      >
                        {item.name}
                      </Link>
                    ))
                  ) : (
                    <span className="text-muted-foreground">
                      No other cities listed.
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold">
                  Competing providers here
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  {competingProviders.length > 0 ? (
                    competingProviders.map((item) => (
                      <Link
                        key={item.slug}
                        href={`/servers/${item.slug}/${country.code.toLowerCase()}/${city.slug}`}
                        className="block text-muted-foreground hover:text-foreground"
                      >
                        {item.name}
                      </Link>
                    ))
                  ) : (
                    <span className="text-muted-foreground">
                      No competing providers detected.
                    </span>
                  )}
                </div>
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
                city: city.slug,
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
