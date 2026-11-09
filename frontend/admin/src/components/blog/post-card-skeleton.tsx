import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PostCard's exact shape so the grid never shifts on load. */
export function PostCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-border bg-surface shadow-sm">
      <Skeleton className="h-48 rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-6">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}
