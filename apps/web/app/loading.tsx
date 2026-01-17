import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background px-6 py-12 md:px-12" role="status" aria-live="polite" aria-label="Loading page">
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-10 w-1/2" aria-hidden="true" />
        <Skeleton className="h-4 w-2/3" aria-hidden="true" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" aria-hidden="true" />
          <Skeleton className="h-24" aria-hidden="true" />
          <Skeleton className="h-24" aria-hidden="true" />
        </div>
        <Skeleton className="h-48" aria-hidden="true" />
      </div>
    </div>
  );
}
