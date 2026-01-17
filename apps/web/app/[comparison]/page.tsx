import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown } from "lucide-react";

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

function getWinner(left: number | null, right: number | null, higherIsBetter: boolean): 'left' | 'right' | 'tie' {
  if (left === null || right === null) return 'tie';
  if (left === right) return 'tie';
  if (higherIsBetter) {
    return left > right ? 'left' : 'right';
  }
  return left < right ? 'left' : 'right';
}

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

  const downloadWinner = getWinner(leftSummary.avgDownload, rightSummary.avgDownload, true);
  const latencyWinner = getWinner(leftSummary.avgPing, rightSummary.avgPing, false);
  const uptimeWinner = getWinner(leftSummary.uptimePct, rightSummary.uptimePct, true);
  const serversWinner = getWinner(leftSummary.serverCount, rightSummary.serverCount, true);

  const metrics = [
    {
      label: "Avg download",
      leftValue: leftSummary.avgDownload,
      rightValue: rightSummary.avgDownload,
      left: formatMetric(leftSummary.avgDownload, "Mbps"),
      right: formatMetric(rightSummary.avgDownload, "Mbps"),
      winner: downloadWinner,
      higherIsBetter: true,
    },
    {
      label: "Avg latency",
      leftValue: leftSummary.avgPing,
      rightValue: rightSummary.avgPing,
      left: formatMetric(leftSummary.avgPing, "ms", 0),
      right: formatMetric(rightSummary.avgPing, "ms", 0),
      winner: latencyWinner,
      higherIsBetter: false,
    },
    {
      label: "Uptime",
      leftValue: leftSummary.uptimePct,
      rightValue: rightSummary.uptimePct,
      left: leftSummary.uptimePct
        ? `${leftSummary.uptimePct.toFixed(1)}%`
        : "-",
      right: rightSummary.uptimePct
        ? `${rightSummary.uptimePct.toFixed(1)}%`
        : "-",
      winner: uptimeWinner,
      higherIsBetter: true,
    },
    {
      label: "Servers monitored",
      leftValue: leftSummary.serverCount,
      rightValue: rightSummary.serverCount,
      left: leftSummary.serverCount.toLocaleString(),
      right: rightSummary.serverCount.toLocaleString(),
      winner: serversWinner,
      higherIsBetter: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background px-6 py-12 md:px-12">
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
                    <span
                      className={
                        metric.winner === 'left'
                          ? 'text-emerald-600 flex items-center gap-1'
                          : metric.winner === 'right'
                            ? 'text-muted-foreground'
                            : ''
                      }
                    >
                      {metric.winner === 'left' && <Crown className="h-3.5 w-3.5" />}
                      {metric.left}
                    </span>
                    <span
                      className={
                        metric.winner === 'right'
                          ? 'text-emerald-600 flex items-center gap-1 justify-end'
                          : metric.winner === 'left'
                            ? 'text-muted-foreground justify-end'
                            : 'justify-end'
                      }
                    >
                      {metric.right}
                      {metric.winner === 'right' && <Crown className="h-3.5 w-3.5" />}
                    </span>
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

        <RelatedComparisons
          leftSlug={parsed.left}
          rightSlug={parsed.right}
          useCase={parsed.useCase}
          currentSlug={params.comparison}
        />
      </div>
    </div>
  );
}

type RelatedComparisonProps = {
  leftSlug: string;
  rightSlug: string;
  useCase: UseCase | null;
  currentSlug: string;
};

async function RelatedComparisons({
  leftSlug,
  rightSlug,
  useCase,
  currentSlug,
}: RelatedComparisonProps) {
  const useCaseSuffix = useCase ? `-${useCase.slug}` : "";

  const relatedSlugs = [
    `${leftSlug}-vs-nordvpn${useCaseSuffix}`,
    `${leftSlug}-vs-expressvpn${useCaseSuffix}`,
    `${leftSlug}-vs-surfshark${useCaseSuffix}`,
    `nordvpn-vs-${rightSlug}${useCaseSuffix}`,
    `expressvpn-vs-${rightSlug}${useCaseSuffix}`,
    `surfshark-vs-${rightSlug}${useCaseSuffix}`,
  ];

  const filteredSlugs = relatedSlugs
    .filter((slug) => slug !== currentSlug.toLowerCase())
    .slice(0, 6);

  if (filteredSlugs.length === 0) return null;

  const relatedData = await Promise.all(
    filteredSlugs.map(async (slug) => {
      const parsed = parseComparisonSlug(slug);
      if (!parsed) return null;

      const [leftSummary, rightSummary] = await Promise.all([
        getProviderSummaryCached(parsed.left),
        getProviderSummaryCached(parsed.right),
      ]);

      if (!leftSummary || !rightSummary) return null;

      return {
        slug,
        leftName: leftSummary.name,
        rightName: rightSummary.name,
        leftLogo: leftSummary.logoUrl,
        rightLogo: rightSummary.logoUrl,
      };
    }),
  );

  const validComparisons = relatedData.filter(
    (data): data is NonNullable<typeof data> => data !== null,
  );

  if (validComparisons.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">You might also compare</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {validComparisons.map((comparison) => (
          <Card
            key={comparison.slug}
            className="group bg-white/80 transition-shadow hover:shadow-md"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2">
                  {comparison.leftLogo && (
                    <img
                      src={comparison.leftLogo}
                      alt={comparison.leftName}
                      className="h-8 w-8 rounded object-contain"
                    />
                  )}
                  <span className="text-sm font-medium">
                    {comparison.leftName}
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">vs</span>
                <div className="flex flex-1 items-center justify-end gap-2">
                  <span className="text-sm font-medium">
                    {comparison.rightName}
                  </span>
                  {comparison.rightLogo && (
                    <img
                      src={comparison.rightLogo}
                      alt={comparison.rightName}
                      className="h-8 w-8 rounded object-contain"
                    />
                  )}
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/${comparison.slug}`}>Compare</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
