import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f7f4ef] px-6 py-12 md:px-12">
      <div className="mx-auto max-w-xl">
        <Card className="bg-white/80">
          <CardContent className="space-y-4 p-6">
            <h1 className="text-2xl font-semibold">Page not found</h1>
            <p className="text-sm text-muted-foreground">
              The page you are looking for does not exist. Try a live servers
              page or run a diagnostic.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/servers">Browse servers</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/tools">Run diagnostics</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
