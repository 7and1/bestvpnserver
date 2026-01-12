import { Skeleton } from "@/components/ui/skeleton";

export default function ToolsLoading() {
  return (
    <div className="min-h-screen bg-[#f7f4ef] px-6 py-12 md:px-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
