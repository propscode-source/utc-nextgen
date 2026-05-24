import { FiltersBarSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4">
      <FiltersBarSkeleton chips={0} />
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
