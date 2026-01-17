import { Skeleton } from "@/components/ui/skeleton";

export default function ToolsLoading() {
  return (
    <div className="min-h-screen bg-background px-6 py-12 md:px-12" role="status" aria-live="polite" aria-label="Loading tools">
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-10 w-1/2" aria-hidden="true" />
        <Skeleton className="h-4 w-2/3" aria-hidden="true" />
        <Skeleton className="h-48 w-full" aria-hidden="true" />
        <Skeleton className="h-48 w-full" aria-hidden="true" />
      </div>
    </div>
  );
}
