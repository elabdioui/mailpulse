import Link from "next/link";

import { cn } from "@/lib/utils";

function hrefFor(archived: boolean, q?: string, status?: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (archived) params.set("archived", "true");
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function ArchivedTabs({
  archived,
  q,
  status,
}: {
  archived: boolean;
  q?: string;
  status?: string;
}) {
  return (
    <div className="flex w-fit gap-1 border-b">
      <Link
        href={hrefFor(false, q, status)}
        className={cn(
          "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
          !archived
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        Actifs
      </Link>
      <Link
        href={hrefFor(true, q, status)}
        className={cn(
          "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
          archived
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        Archivés
      </Link>
    </div>
  );
}
