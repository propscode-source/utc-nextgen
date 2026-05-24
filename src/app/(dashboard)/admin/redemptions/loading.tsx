import { PageHeaderSkeleton, FiltersBarSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FiltersBarSkeleton chips={7} />
      <TableSkeleton rows={8} cols={7} />
    </div>
  );
}
