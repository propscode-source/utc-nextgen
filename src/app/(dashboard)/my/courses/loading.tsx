import { PageHeaderSkeleton, FiltersBarSkeleton, CardGridSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FiltersBarSkeleton chips={0} />
      <CardGridSkeleton count={6} lines={2} />
    </div>
  );
}
