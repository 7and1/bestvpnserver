"use client";

import { useEffect, useState } from "react";
import { Building2, Clock, Globe, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface IPInfo {
  ip: string;
  geo: {
    country: string;
    countryCode: string;
    city: string;
    region: string;
    latitude: number | null;
    longitude: number | null;
    timezone: string;
    isp: string;
    organization: string;
  } | null;
  isVPN: boolean;
}

export function IPLookup() {
  const [info, setInfo] = useState<IPInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tools/my-ip")
      .then((res) => res.json())
      .then(setInfo)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </Card>
    );
  }

  if (!info) return null;

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold">Your IP Address</h2>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <code className="rounded bg-muted px-3 py-1 text-lg">{info.ip}</code>
        {info.isVPN && <Badge variant="success">VPN Detected</Badge>}
      </div>

      {info.geo && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3">
            <MapPin className="mt-1 h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Location</div>
              <div className="text-sm text-muted-foreground">
                {info.geo.city}, {info.geo.region}
              </div>
              <div className="text-sm text-muted-foreground">
                {info.geo.country}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Globe className="mt-1 h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Coordinates</div>
              <div className="text-sm text-muted-foreground">
                {info.geo.latitude !== null && info.geo.longitude !== null
                  ? `${info.geo.latitude.toFixed(4)}, ${info.geo.longitude.toFixed(4)}`
                  : "Unknown"}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building2 className="mt-1 h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">ISP / Organization</div>
              <div className="text-sm text-muted-foreground">
                {info.geo.isp || info.geo.organization || "Unknown"}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="mt-1 h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Timezone</div>
              <div className="text-sm text-muted-foreground">
                {info.geo.timezone || "Unknown"}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
