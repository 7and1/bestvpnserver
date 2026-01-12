import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProviderSummaryCached } from "@/lib/data/providers";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/pseo/schema";
import { USE_CASES, type UseCase } from "@/lib/pseo/use-cases";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

type ComparisonResult = {
  left: string;
  right: string;
  useCase: UseCase | null;
};

function parseComparisonSlug(slug: string): ComparisonResult | null {
  const normalized = slug.toLowerCase();
  const parts = normalized.split("-vs-");
  if (parts.length !== 2) return null;
  const left = parts[0];
  let rightPart = parts[1];
  let useCase: UseCase | null = null;

  for (const candidate of USE_CASES) {
    const suffix = `-${candidate.slug}`;
    if (rightPart.endsWith(suffix)) {
      useCase = candidate;
      rightPart = rightPart.slice(0, -suffix.length);
      break;
    }
  }

  if (!left || !rightPart) return null;
  return { left, right: rightPart, useCase };
}

function formatMetric(value: number | null, suffix: string, digits = 1) {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(digits)} ${suffix}`;
}

export async function generateMetadata({
  params,
}: {
  params: { comparison: string };
}) {
  const parsed = parseComparisonSlug(params.comparison);
  if (!parsed) {
    return {
      title: "VPN Comparison",
      description:
        "Side-by-side VPN provider comparison based on live telemetry.",
    };
  }

  const title = parsed.useCase
    ? `${parsed.left} vs ${parsed.right} (${parsed.useCase.label})`
    : `${parsed.left} vs ${parsed.right}`;

  return {
    title: `${title} - Live Performance Comparison`,
    description:
      "Compare VPN providers using real-time latency and speed measurements.",
    alternates: {
      canonical: `${SITE_URL}/${params.comparison.toLowerCase()}`,
    },
  };
}

export default async function ComparisonPage({
  params,
}: {
  params: { comparison: string };
}) {
  const parsed = parseComparisonSlug(params.comparison);
  if (!parsed) notFound();

  const leftSummary = await getProviderSummaryCached(parsed.left);
  const rightSummary = await getProviderSummaryCached(parsed.right);

  if (!leftSummary || !rightSummary) {
    notFound();
  }

  const title = parsed.useCase
    ? `${leftSummary.name} vs ${rightSummary.name} (${parsed.useCase.label})`
    : `${leftSummary.name} vs ${rightSummary.name}`;

  const breadcrumbItems = [
    { label: "Servers", href: "/servers" },
    { label: title, href: `/${params.comparison}` },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      buildWebPageSchema({
        name: title,
        description: "Live performance comparison for two VPN providers.",
        url: `/${params.comparison}`,
      }),
      buildBreadcrumbSchema(breadcrumbItems),
    ],
  };

  const metrics = [
    {
      label: "Avg download",
      left: formatMetric(leftSummary.avgDownload, "Mbps"),
      right: formatMetric(rightSummary.avgDownload, "Mbps"),
    },
    {
      label: "Avg latency",
      left: formatMetric(leftSummary.avgPing, "ms", 0),
      right: formatMetric(rightSummary.avgPing, "ms", 0),
    },
    {
      label: "Uptime",
      left: leftSummary.uptimePct
        ? `${leftSummary.uptimePct.toFixed(1)}%`
        : "-",
      right: rightSummary.uptimePct
        ? `${rightSummary.uptimePct.toFixed(1)}%`
        : "-",
    },
    {
      label: "Servers monitored",
      left: leftSummary.serverCount.toLocaleString(),
      right: rightSummary.serverCount.toLocaleString(),
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f4ef] px-6 py-12 md:px-12">
      <JsonLd data={schema} />
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="space-y-3">
          <Badge variant="secondary" className="rounded-full px-4 py-1">
            Head-to-head comparison
          </Badge>
          <h1 className="text-4xl font-semibold">{title}</h1>
          <p className="text-muted-foreground">
            Live telemetry comparison based on speed, latency, and uptime
            metrics.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-white/80">
            <CardContent className="p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Provider A
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {leftSummary.name}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {leftSummary.countryCount} countries · {leftSummary.cityCount}{" "}
                cities
              </div>
              <div className="mt-6">
                <Button asChild>
                  <Link href={`/servers/${leftSummary.slug}`}>
                    View servers
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Provider B
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {rightSummary.name}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {rightSummary.countryCount} countries · {rightSummary.cityCount}{" "}
                cities
              </div>
              <div className="mt-6">
                <Button asChild>
                  <Link href={`/servers/${rightSummary.slug}`}>
                    View servers
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/80">
          <CardContent className="p-6">
            <div className="text-sm font-semibold">Performance snapshot</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-border/60 bg-white/60 p-4"
                >
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {metric.label}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm font-semibold">
                    <span>{metric.left}</span>
                    <span>{metric.right}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white/80">
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Affiliate offers</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Grab the latest deals from each provider.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {leftSummary.affiliateLink && (
                  <Button asChild>
                    <Link href={`/go/${leftSummary.slug}`}>
                      Go to {leftSummary.name}
                    </Link>
                  </Button>
                )}
                {rightSummary.affiliateLink && (
                  <Button variant="outline" asChild>
                    <Link href={`/go/${rightSummary.slug}`}>
                      Go to {rightSummary.name}
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          {parsed.useCase && (
            <Card className="bg-white/80">
              <CardContent className="p-6">
                <div className="text-sm font-semibold">Use-case focus</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  This comparison highlights providers performing best for{" "}
                  {parsed.useCase.label}.
                </p>
                <div className="mt-4">
                  <Button variant="outline" asChild>
                    <Link href={`/best-vpn-for-${parsed.useCase.slug}`}>
                      See {parsed.useCase.label} rankings
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
