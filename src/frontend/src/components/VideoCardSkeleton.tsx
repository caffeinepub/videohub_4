import { Skeleton } from "@/components/ui/skeleton";

export default function VideoCardSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden bg-card border border-border">
      {/* Thumbnail skeleton */}
      <div className="aspect-video w-full skeleton-shimmer" />

      {/* Info skeleton */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full skeleton-shimmer" />
        <Skeleton className="h-3 w-2/3 skeleton-shimmer" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-12 skeleton-shimmer" />
          <Skeleton className="h-3 w-12 skeleton-shimmer" />
          <Skeleton className="h-3 w-16 skeleton-shimmer ml-auto" />
        </div>
      </div>
    </div>
  );
}
