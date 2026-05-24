import { PageHeaderSkeleton, FiltersBarSkeleton, CardGridSkeleton, ListRowsSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FiltersBarSkeleton chips={0} />
      <CardGridSkeleton count={6} />
      <ListRowsSkeleton rows={4} />
    </div>
  );
}
