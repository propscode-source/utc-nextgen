import { PageHeaderSkeleton, FiltersBarSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FiltersBarSkeleton chips={3} />
      <TableSkeleton rows={6} cols={5} />
      <TableSkeleton rows={10} cols={5} />
    </div>
  );
}
