import type { ProviderSummary } from "@/lib/cache/provider-summary";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InfoItem {
  label: string;
  value: string | number | null;
}

function InfoRow({ label, value }: InfoItem) {
  if (!value) return null;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function formatProtocols(protocols: string | null): string | null {
  if (!protocols) return null;
  try {
    const parsed = JSON.parse(protocols);
    if (Array.isArray(parsed)) {
      return parsed.join(", ");
    }
    return protocols;
  } catch {
    return protocols;
  }
}

interface ProviderInfoCardProps {
  provider: Pick<
    ProviderSummary,
    | "foundedYear"
    | "headquarters"
    | "protocols"
    | "refundPolicy"
    | "deviceLimit"
    | "pricingTier"
  >;
  className?: string;
}

export function ProviderInfoCard({ provider, className }: ProviderInfoCardProps) {
  const infoItems: InfoItem[] = [
    {
      label: "Founded",
      value: provider.foundedYear ? provider.foundedYear.toString() : null,
    },
    {
      label: "Headquarters",
      value: provider.headquarters,
    },
    {
      label: "Protocols",
      value: formatProtocols(provider.protocols),
    },
    {
      label: "Refund policy",
      value: provider.refundPolicy,
    },
    {
      label: "Device limit",
      value: provider.deviceLimit,
    },
    {
      label: "Pricing tier",
      value: provider.pricingTier,
    },
  ];

  const hasData = infoItems.some((item) => item.value !== null);

  if (!hasData) {
    return null;
  }

  return (
    <Card className={cn("bg-white/80", className)}>
      <CardContent className="p-6">
        <h3 className="mb-4 text-sm font-semibold">Provider information</h3>
        <div className="space-y-3">
          {infoItems.map((item) => (
            <InfoRow key={item.label} {...item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
