import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-20 w-20 rounded-full mx-auto" />
            <Skeleton className="h-5 w-32 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
      <TableSkeleton rows={6} cols={4} />
    </div>
  );
}
