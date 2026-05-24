import { PageHeaderSkeleton, StatsSkeleton, FiltersBarSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatsSkeleton count={3} />
      <FiltersBarSkeleton chips={0} />
      <TableSkeleton rows={8} cols={7} />
    </div>
  );
}
