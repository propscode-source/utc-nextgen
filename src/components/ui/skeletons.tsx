import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({ withDescription = true }: { withDescription?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-56" />
      {withDescription && <Skeleton className="h-4 w-80 max-w-full" />}
    </div>
  );
}

export function FiltersBarSkeleton({ chips = 3 }: { chips?: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from({ length: chips }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-9 w-full sm:ml-auto sm:w-64 md:w-80" />
    </div>
  );
}

type CardGridSkeletonProps = {
  count?: number;
  className?: string;
  cardClassName?: string;
  lines?: number;
};

export function CardGridSkeleton({
  count = 6,
  className = "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
  cardClassName,
  lines = 3,
}: CardGridSkeletonProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={cn("flex flex-col", cardClassName)}>
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: lines }).map((_, j) => (
              <Skeleton key={j} className={cn("h-3", j === lines - 1 ? "w-2/3" : "w-full")} />
            ))}
            <div className="mt-3 flex items-center gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type TableSkeletonProps = {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
};

export function TableSkeleton({ rows = 8, cols = 5, showHeader = true }: TableSkeletonProps) {
  return (
    <div className="rounded-md border overflow-hidden">
      {showHeader && (
        <div className="border-b bg-muted/40 px-4 py-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      )}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="px-4 py-3 grid gap-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn("h-4", c === 0 ? "w-32" : "w-20")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={cn("grid gap-4", count >= 4 ? "md:grid-cols-4" : count === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ListRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}

export function FullPageSkeleton({
  header = true,
  filters = true,
  variant = "cards",
}: {
  header?: boolean;
  filters?: boolean;
  variant?: "cards" | "table" | "list";
}) {
  return (
    <div className="space-y-6">
      {header && <PageHeaderSkeleton />}
      {filters && <FiltersBarSkeleton />}
      {variant === "cards" && <CardGridSkeleton />}
      {variant === "table" && <TableSkeleton />}
      {variant === "list" && <ListRowsSkeleton />}
    </div>
  );
}
