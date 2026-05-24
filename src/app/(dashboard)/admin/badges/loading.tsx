import { PageHeaderSkeleton, FiltersBarSkeleton, CardGridSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FiltersBarSkeleton chips={0} />
      <CardGridSkeleton count={6} className="grid gap-4 md:grid-cols-2" />
    </div>
  );
}
