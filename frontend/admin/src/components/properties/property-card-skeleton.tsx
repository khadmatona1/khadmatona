import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PropertyCard's exact shape so the grid never shifts on load. */
export function PropertyCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <Skeleton className="mx-3 mt-3 aspect-[4/3] rounded-xl" />
      <div className="flex flex-col gap-2 px-5 pt-4 pb-5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-5 w-2/3" />
        <div className="mt-auto flex items-center gap-3 pt-1">
          <Skeleton className="h-3.5 w-8" />
          <Skeleton className="h-3.5 w-8" />
          <Skeleton className="h-3.5 w-14" />
        </div>
      </div>
    </div>
  );
}
