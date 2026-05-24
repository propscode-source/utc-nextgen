import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="relative flex min-h-[100svh] w-full max-w-[100vw] flex-col overflow-x-hidden bg-background">
      <header className="container relative flex w-full items-center justify-between gap-2 py-3 sm:py-4 md:py-5">
        <Skeleton className="h-9 w-32 sm:w-40 md:w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 sm:h-10 sm:w-20" />
          <Skeleton className="h-8 w-20 sm:h-10 sm:w-28" />
        </div>
      </header>

      <section className="container relative flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
        <div className="flex w-full max-w-2xl flex-col items-center gap-4">
          <Skeleton className="h-6 w-72 rounded-full" />
          <Skeleton className="h-12 w-full max-w-xl" />
          <Skeleton className="h-12 w-4/5" />
          <Skeleton className="h-5 w-full max-w-md" />
          <div className="mt-4 flex gap-3">
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-32" />
          </div>
        </div>

        <div className="mt-10 grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-lg border p-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
