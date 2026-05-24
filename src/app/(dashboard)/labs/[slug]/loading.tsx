import { PageHeaderSkeleton, StatsSkeleton, CardGridSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatsSkeleton count={4} />
      <CardGridSkeleton count={3} />
    </div>
  );
}
