"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ServersError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#f7f4ef] px-6 py-12 md:px-12">
      <div className="mx-auto max-w-xl">
        <Card className="bg-white/80">
          <CardContent className="space-y-4 p-6">
            <h1 className="text-2xl font-semibold">Unable to load servers</h1>
            <p className="text-sm text-muted-foreground">
              Our server list is temporarily unavailable. Please retry or return
              home.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => reset()}>Retry</Button>
              <Button variant="outline" asChild>
                <Link href="/">Go home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
