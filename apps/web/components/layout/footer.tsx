import Link from "next/link";

const footerLinks = {
  product: [
    { label: "Servers", href: "/servers" },
    { label: "Diagnostic Tools", href: "/tools" },
    { label: "Status", href: "/status" },
  ],
  useCases: [
    { label: "Best VPN for Streaming", href: "/best-vpn-for-streaming" },
    { label: "Best VPN for Gaming", href: "/best-vpn-for-gaming" },
    { label: "Best VPN for Privacy", href: "/best-vpn-for-privacy" },
    { label: "Best VPN for China", href: "/best-vpn-for-china" },
    { label: "Best Cheap VPN", href: "/best-cheap-vpn" },
    { label: "Fastest VPN", href: "/fastest-vpn" },
    { label: "VPN with Dedicated IP", href: "/best-vpn-with-dedicated-ip" },
    { label: "VPN with Port Forwarding", href: "/best-vpn-with-port-forwarding" },
  ],
  tools: [
    { label: "IP Lookup", href: "/tools#ip-lookup" },
    { label: "DNS Leak Test", href: "/tools#dns-leak" },
    { label: "Speed Test", href: "/tools#speed-test" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Contact", href: "/contact" },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-foreground/10 bg-white/60 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                BV
              </div>
              <span className="font-semibold">BestVPNServer</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Data-driven VPN monitoring platform with real-time performance
              metrics and server rankings.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Use Cases</h3>
            <ul className="space-y-2">
              {footerLinks.useCases.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Tools</h3>
            <ul className="space-y-2">
              {footerLinks.tools.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} BestVPNServer.com. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Server data updated every 5 minutes from global probe network.
          </p>
        </div>
      </div>
    </footer>
  );
}
