"use client";

import { formatRelativeFr } from "@/lib/datetime";

export function RelativeTime({
  iso,
  exact,
  className,
}: {
  iso: string;
  exact: string;
  className?: string;
}) {
  return (
    <time dateTime={iso} title={exact} className={className}>
      {formatRelativeFr(iso)}
    </time>
  );
}
