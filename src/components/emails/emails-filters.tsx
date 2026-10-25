import { SearchIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export interface EmailsFiltersValue {
  q?: string;
  status?: "opened" | "pending" | "follow_up";
  archived: boolean;
}

function buildHref(value: Partial<EmailsFiltersValue>): string {
  const params = new URLSearchParams();
  if (value.q) params.set("q", value.q);
  if (value.status) params.set("status", value.status);
  if (value.archived) params.set("archived", "true");
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function Pill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-7 items-center rounded-md px-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function EmailsFilters({ q, status, archived }: EmailsFiltersValue) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <form
        className="relative w-full sm:max-w-xs"
        action="/"
        method="get"
      >
        <input type="hidden" name="status" value={status ?? ""} />
        <input
          type="hidden"
          name="archived"
          value={archived ? "true" : "false"}
        />
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher un libellé, un objet ou une adresse…"
          className="h-8 w-full rounded-lg border border-input bg-transparent py-1 pr-2.5 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </form>

      <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
        <Pill
          href={buildHref({ q, archived })}
          active={status === undefined}
        >
          Tous
        </Pill>
        <Pill
          href={buildHref({ q, archived, status: "opened" })}
          active={status === "opened"}
        >
          Ouverts
        </Pill>
        <Pill
          href={buildHref({ q, archived, status: "pending" })}
          active={status === "pending"}
        >
          En attente
        </Pill>
        <Pill
          href={buildHref({ q, archived, status: "follow_up" })}
          active={status === "follow_up"}
        >
          À relancer
        </Pill>
      </div>
    </div>
  );
}
