import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface TableSkeletonProps {
  /**
   * Number of skeleton rows to display
   * @default 5
   */
  rows?: number;
  /**
   * Number of skeleton columns per row
   * @default 5
   */
  columns?: number;
  /**
   * Whether to show header skeleton
   * @default true
   */
  showHeader?: boolean;
  /**
   * Whether to show pagination skeleton
   * @default true
   */
  showPagination?: boolean;
  /**
   * Custom column widths (as CSS classes or inline styles)
   */
  columnWidths?: string[];
  /**
   * Additional class names for the container
   */
  className?: string;
}

const DEFAULT_COLUMN_WIDTHS = [
  "w-24", // Provider
  "w-32", // Location
  "w-16", // Ping
  "w-20", // Download
  "w-16", // Status
];

function SkeletonCell({
  width,
}: {
  width?: string;
}) {
  return (
    <Skeleton
      className={cn("h-5", width)}
    />
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  showHeader = true,
  showPagination = true,
  columnWidths = DEFAULT_COLUMN_WIDTHS,
  className,
}: TableSkeletonProps) {
  const widths = columnWidths.length > 0 ? columnWidths : undefined;

  return (
    <div className={cn("space-y-3", className)} role="status" aria-live="polite" aria-label="Loading table data">
      {/* Header and pagination row */}
      <div className="flex items-center justify-between">
        {showHeader && <Skeleton className="h-6 w-32" />}
        {showPagination && <Skeleton className="h-8 w-24" />}
      </div>

      {/* Table container */}
      <div className="rounded-2xl border border-foreground/10 bg-white/70 overflow-hidden">
        {/* Table header row */}
        {showHeader && (
          <div className="h-10 bg-muted/50" />
        )}

        {/* Skeleton rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex gap-4 border-t border-border/40 p-4"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonCell
                key={colIndex}
                width={widths?.[colIndex % widths.length]}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
