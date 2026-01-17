"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background px-6 py-12 md:px-12">
      <div className="mx-auto max-w-xl">
        <Card className="bg-white/80">
          <CardContent className="space-y-4 p-6" role="alert" aria-live="assertive">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              We could not load this page. Try again or return to the homepage.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => reset()}>Retry</Button>
              <Button variant="outline" asChild>
                <Link href="/">Go home</Link>
              </Button>
            </div>
            {error?.digest && (
              <p className="text-xs text-muted-foreground">
                Error ID: {error.digest}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
