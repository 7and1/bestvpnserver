"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { swrFetcher } from "@/lib/api/fetcher";

type ServerRow = {
  id: number;
  hostname: string | null;
  ip_address: string | null;
  provider_name: string;
  provider_slug: string;
  city_name: string;
  country_name: string;
  country_code: string;
  ping_ms: number | null;
  download_mbps: number | string | null;
  upload_mbps: number | string | null;
  connection_success: boolean | null;
  measured_at: string | null;
};

const PAGE_SIZE = 20;

function formatMbps(value: number | string | null) {
  if (value === null || value === undefined) return "–";
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)} Mbps` : "–";
}

function formatPing(value: number | null) {
  if (value === null || value === undefined) return "–";
  return `${value} ms`;
}

export function ServerTable({ query }: { query?: Record<string, string> }) {
  const [page, setPage] = React.useState(0);
  const offset = page * PAGE_SIZE;

  const params = new URLSearchParams({
    ...query,
    limit: PAGE_SIZE.toString(),
    offset: offset.toString(),
  });

  const { data, isLoading, error } = useSWR(
    `/api/servers?${params.toString()}`,
    swrFetcher,
    { refreshInterval: 30000 },
  );

  const columns = React.useMemo<ColumnDef<ServerRow>[]>(
    () => [
      {
        accessorKey: "provider_name",
        header: "Provider",
        cell: ({ row }) => (
          <Link
            href={`/servers/${row.original.provider_slug}`}
            className="font-medium hover:underline"
          >
            {row.original.provider_name}
          </Link>
        ),
      },
      {
        id: "location",
        header: "Location",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.city_name}, {row.original.country_name}
          </div>
        ),
      },
      {
        accessorKey: "ping_ms",
        header: "Ping",
        cell: ({ row }) => formatPing(row.original.ping_ms),
      },
      {
        accessorKey: "download_mbps",
        header: "Download",
        cell: ({ row }) => formatMbps(row.original.download_mbps),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.connection_success ? (
            <Badge variant="success">Online</Badge>
          ) : (
            <Badge variant="secondary">Unknown</Badge>
          ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const total = data?.total ?? 0;
  const hasData = data?.data && data.data.length > 0;
  const hasNextPage = (page + 1) * PAGE_SIZE < total;
  const hasPrevPage = page > 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = page + 1;
  const startItem = total > 0 ? offset + 1 : 0;
  const endItem = Math.min(offset + (data?.data?.length || 0), total);

  if (isLoading) {
    return <TableSkeleton rows={5} columns={5} />;
  }

  if (error || data?.error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center" role="alert" aria-live="assertive">
        <p className="text-sm text-destructive">
          Failed to load servers. Please try again shortly.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-foreground/10 bg-white/70 p-12 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <h3 className="text-lg font-semibold">No servers found</h3>
          <p className="text-sm text-muted-foreground">
            Server data will appear here once our global probe network begins
            reporting telemetry.
          </p>
          <Button variant="outline" asChild>
            <Link href="/status">Check system status</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total > 0 ? (
            <>Showing {startItem}–{endItem} of {total.toLocaleString()} servers</>
          ) : (
            <>No servers found</>
          )}
        </p>
        <div className="flex items-center gap-2" role="navigation" aria-label="Server list pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrevPage}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Go to previous page"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNextPage}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Go to next page"
          >
            Next
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-foreground/10 bg-white/80 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} scope="col">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {(hasPrevPage || hasNextPage) && (
        <div className="flex items-center justify-center gap-2 pt-2" role="navigation" aria-label="Table pagination controls">
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasPrevPage}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Go to previous page"
          >
            ← Previous
          </Button>
          <span className="text-sm text-muted-foreground px-4" aria-live="polite" aria-atomic="true">
            Page {currentPage} of {totalPages > 0 ? totalPages : 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasNextPage}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Go to next page"
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
