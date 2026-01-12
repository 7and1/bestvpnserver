import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getUseCaseRanking } from "@/lib/data/use-cases";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/pseo/schema";
import { getUseCase, USE_CASES } from "@/lib/pseo/use-cases";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return USE_CASES.map((useCase) => ({ purpose: useCase.slug }));
}

function formatMetric(value: number | null, suffix: string, digits = 1) {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(digits)} ${suffix}`;
}

export async function generateMetadata({
  params,
}: {
  params: { purpose: string };
}) {
  const purpose = params?.purpose?.toLowerCase() ?? "";
  const useCase = getUseCase(purpose);
  if (!useCase) {
    return {
      title: "Best VPN",
      description:
        "Data-driven VPN recommendations and live performance metrics.",
    };
  }

  return {
    title: `Best VPN for ${useCase.label} - Tested Rankings`,
    description: useCase.description,
    alternates: {
      canonical: `${SITE_URL}/best-vpn-for-${useCase.slug}`,
    },
  };
}

export default async function UseCasePage({
  params,
}: {
  params: { purpose: string };
}) {
  const purpose = params?.purpose?.toLowerCase() ?? "";
  const useCase = getUseCase(purpose);
  if (!useCase) notFound();

  const providers = await getUseCaseRanking(useCase);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Servers", href: "/servers" },
    {
      label: `Best VPN for ${useCase.label}`,
      href: `/best-vpn-for-${useCase.slug}`,
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      buildWebPageSchema({
        name: `Best VPN for ${useCase.label}`,
        description: useCase.description,
        url: `/best-vpn-for-${useCase.slug}`,
      }),
      buildBreadcrumbSchema(breadcrumbItems),
    ],
  };

  return (
    <div className="min-h-screen bg-background px-6 py-12 md:px-12">
      <JsonLd data={schema} />
      <div className="mx-auto max-w-6xl space-y-10">
        <Breadcrumbs items={breadcrumbItems} className="mb-6" />
        <header className="space-y-3">
          <Badge variant="secondary" className="rounded-full px-4 py-1">
            Use-case ranking
          </Badge>
          <h1 className="text-4xl font-semibold">
            Best VPN for {useCase.label}
          </h1>
          <p className="text-muted-foreground">{useCase.description}</p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Providers ranked
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {providers.length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Primary metric
              </div>
              <div className="mt-2 text-2xl font-semibold capitalize">
                {useCase.primaryMetric}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Coverage
              </div>
              <div className="mt-2 text-2xl font-semibold">Global</div>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Top providers</h2>
            <Button variant="outline" asChild>
              <Link href="/servers">Explore live servers</Link>
            </Button>
          </div>
          <div className="grid gap-4">
            {providers.length === 0 ? (
              <Card className="bg-white/80">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  No provider telemetry is available yet. Probe data will
                  populate this list.
                </CardContent>
              </Card>
            ) : (
              providers.map((provider, index) => (
                <Card key={provider.id} className="bg-white/80">
                  <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Rank #{index + 1}
                      </div>
                      <div className="mt-2 text-xl font-semibold">
                        {provider.name}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {provider.serverCount} servers monitored
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm md:grid-cols-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Download
                        </div>
                        <div className="mt-1 font-semibold">
                          {formatMetric(provider.avgDownload, "Mbps")}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Latency
                        </div>
                        <div className="mt-1 font-semibold">
                          {formatMetric(provider.avgPing, "ms", 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Uptime
                        </div>
                        <div className="mt-1 font-semibold">
                          {provider.uptimePct
                            ? `${provider.uptimePct.toFixed(1)}%`
                            : "-"}
                        </div>
                      </div>
                    </div>
                    <Button asChild>
                      <Link href={`/servers/${provider.slug}`}>
                        View servers
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
