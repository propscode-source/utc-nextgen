import { PageHeaderSkeleton, FiltersBarSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FiltersBarSkeleton chips={2} />
      <TableSkeleton rows={6} cols={6} />
    </div>
  );
}
