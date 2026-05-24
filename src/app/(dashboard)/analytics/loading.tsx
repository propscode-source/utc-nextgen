import { PageHeaderSkeleton, StatsSkeleton, ChartSkeleton, CardGridSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatsSkeleton count={3} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <CardGridSkeleton count={3} />
    </div>
  );
}
