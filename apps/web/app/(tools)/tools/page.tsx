import { DNSLeakTest } from "@/components/tools/dns-leak-test";
import { IPLookup } from "@/components/tools/ip-lookup";
import { SpeedTest } from "@/components/tools/speed-test";
import { WebRTCLeakTest } from "@/components/tools/webrtc-leak-test";

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#f7f4ef] px-6 py-12 md:px-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-4xl font-semibold">VPN Diagnostic Tools</h1>
          <p className="mt-3 text-muted-foreground">
            Run instant checks from your browser to validate VPN protection and
            performance.
          </p>
        </div>

        <div className="grid gap-6">
          <IPLookup />
          <WebRTCLeakTest />
          <DNSLeakTest />
          <SpeedTest />
        </div>
      </div>
    </div>
  );
}
