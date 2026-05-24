import { PageHeaderSkeleton, StatsSkeleton, FiltersBarSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatsSkeleton count={4} />
      <FiltersBarSkeleton chips={5} />
      <TableSkeleton rows={10} cols={6} />
    </div>
  );
}
