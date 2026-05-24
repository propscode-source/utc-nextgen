import { PageHeaderSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <TableSkeleton rows={8} cols={9} />
    </div>
  );
}
