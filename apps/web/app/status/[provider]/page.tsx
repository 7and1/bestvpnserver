import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProviderStatus } from "@/lib/data/status";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/pseo/schema";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

function formatMetric(value: number | null, suffix: string, digits = 1) {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(digits)} ${suffix}`;
}

export async function generateMetadata({
  params,
}: {
  params: { provider: string };
}) {
  return {
    title: `${params.provider} VPN Status - Live Network Health`,
    description: `Live network health and uptime metrics for ${params.provider}.`,
    alternates: {
      canonical: `${SITE_URL}/status/${params.provider}`,
    },
  };
}

export default async function ProviderStatusPage({
  params,
}: {
  params: { provider: string };
}) {
  const status = await getProviderStatus(params.provider);
  if (!status) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      buildWebPageSchema({
        name: `${status.providerName} Status`,
        description: `Live VPN status metrics for ${status.providerName}.`,
        url: `/status/${status.providerSlug}`,
      }),
      buildBreadcrumbSchema([
        { label: "Servers", href: "/servers" },
        {
          label: `${status.providerName} status`,
          href: `/status/${status.providerSlug}`,
        },
      ]),
    ],
  };

  const onlinePct = status.totalServers
    ? (status.onlineServers / status.totalServers) * 100
    : null;

  return (
    <div className="min-h-screen bg-background px-6 py-12 md:px-12">
      <JsonLd data={schema} />
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="space-y-3">
          <Badge variant="secondary" className="rounded-full px-4 py-1">
            Live status
          </Badge>
          <h1 className="text-4xl font-semibold">
            {status.providerName} Status
          </h1>
          <p className="text-muted-foreground">
            Live uptime and performance health for {status.providerName}{" "}
            servers.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Online servers
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {status.onlineServers} / {status.totalServers}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {onlinePct ? `${onlinePct.toFixed(1)}% online` : "-"}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Avg download
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {formatMetric(status.avgDownload, "Mbps")}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Avg latency
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {formatMetric(status.avgPing, "ms", 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/80">
          <CardContent className="p-6 space-y-2">
            <div className="text-sm font-semibold">Last probe update</div>
            <div className="text-sm text-muted-foreground">
              {status.lastMeasured
                ? new Date(status.lastMeasured).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Awaiting the latest probe run."}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/servers/${status.providerSlug}`}>View servers</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/go/${status.providerSlug}`}>Visit provider</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
