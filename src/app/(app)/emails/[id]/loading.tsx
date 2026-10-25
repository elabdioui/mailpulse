import { Skeleton } from "@/components/ui/skeleton";

export default function EmailDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="size-8 rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-8" />
        <Skeleton className="h-16 sm:col-span-2" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}
