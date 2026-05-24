import { PageHeaderSkeleton, FiltersBarSkeleton, CardGridSkeleton, ListRowsSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FiltersBarSkeleton chips={3} />
      <CardGridSkeleton count={3} className="grid gap-4 sm:grid-cols-3" lines={2} />
      <ListRowsSkeleton rows={10} />
    </div>
  );
}
