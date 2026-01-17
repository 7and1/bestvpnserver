import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProviderHighlightsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <section className="space-y-6" role="status" aria-live="polite" aria-label="Loading provider highlights">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32 rounded-full" aria-hidden="true" />
          <Skeleton className="h-9 w-64" aria-hidden="true" />
          <Skeleton className="h-5 w-80" aria-hidden="true" />
        </div>
        <Skeleton className="h-10 w-32" aria-hidden="true" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="bg-white/80">
            <CardContent className="flex h-full flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" aria-hidden="true" />
                <Skeleton className="h-5 w-20" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" aria-hidden="true" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" aria-hidden="true" />
                  <Skeleton className="h-3 w-32" aria-hidden="true" />
                </div>
              </div>
              <Skeleton className="h-4 w-40" aria-hidden="true" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" aria-hidden="true" />
                  <Skeleton className="h-4 w-12" aria-hidden="true" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" aria-hidden="true" />
                  <Skeleton className="h-4 w-12" aria-hidden="true" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" aria-hidden="true" />
                  <Skeleton className="h-4 w-20" aria-hidden="true" />
                </div>
              </div>
              <Skeleton className="mt-auto h-10 w-full" aria-hidden="true" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
