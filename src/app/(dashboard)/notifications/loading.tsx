import { PageHeaderSkeleton, ListRowsSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <ListRowsSkeleton rows={8} />
    </div>
  );
}
