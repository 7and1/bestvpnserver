import { DNSLeakTest } from "@/components/tools/dns-leak-test";
import { IPLookup } from "@/components/tools/ip-lookup";
import { SpeedTest } from "@/components/tools/speed-test";
import { WebRTCLeakTest } from "@/components/tools/webrtc-leak-test";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-12 md:px-12">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between motion-safe:animate-fade-in-up">
          <div>
            <Badge variant="secondary" className="rounded-full px-4 py-1">
              Browser diagnostics
            </Badge>
            <h1 className="mt-4 text-4xl font-semibold">
              VPN Diagnostic Tools
            </h1>
            <p className="mt-3 text-muted-foreground">
              Run instant checks from your browser to validate VPN protection
              and performance.
            </p>
          </div>
          <Card className="border-foreground/10 bg-white/80">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Recommended flow: IP lookup → WebRTC leak → DNS leak → Speed test.
            </CardContent>
          </Card>
        </header>

        <div className="grid gap-6 lg:grid-cols-2 scroll-smooth">
          <div className="space-y-6">
            <div id="ip-lookup">
              <IPLookup />
            </div>
            <div id="dns-leak">
              <DNSLeakTest />
            </div>
          </div>
          <div className="space-y-6">
            <div id="webrtc-leak">
              <WebRTCLeakTest />
            </div>
            <div id="speed-test">
              <SpeedTest />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
