import Link from "next/link";

import { Button } from "@/components/ui/button";

const navigation = [
  { label: "Servers", href: "/servers" },
  { label: "Tools", href: "/tools" },
  { label: "Status", href: "/status" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              BV
            </div>
            <span className="font-semibold hidden sm:inline-block">
              BestVPNServer
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="hidden sm:inline-flex"
          >
            <Link href="/tools">Check My IP</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
