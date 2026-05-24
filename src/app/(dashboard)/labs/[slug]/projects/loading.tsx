import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton withDescription={false} />
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <Card key={col}>
            <CardContent className="p-3 space-y-2">
              <Skeleton className="h-4 w-20" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
