import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton, FiltersBarSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FiltersBarSkeleton chips={0} />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-9 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
