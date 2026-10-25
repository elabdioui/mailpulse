import { Badge } from "@/components/ui/badge";
import type { CheckStatus, DeliverabilityCheck } from "@/lib/deliverability";
import { cn } from "@/lib/utils";

const DOT_STYLES: Record<CheckStatus, string> = {
  pass: "bg-emerald-500",
  warn: "bg-amber-500",
  fail: "bg-red-500",
};

const BADGE_STYLES: Record<CheckStatus, string> = {
  pass: "border-transparent bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  warn: "border-transparent bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  fail: "border-transparent bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-400",
};

const BADGE_LABELS: Record<CheckStatus, string> = {
  pass: "OK",
  warn: "À surveiller",
  fail: "À corriger",
};

export function CheckRow({ check }: { check: DeliverabilityCheck }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span
            className={cn("size-2.5 shrink-0 rounded-full", DOT_STYLES[check.status])}
            aria-hidden="true"
          />
          <p className="font-medium">{check.label}</p>
        </div>
        <p className="text-sm text-muted-foreground">{check.detail}</p>
        {check.fix ? (
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Correction : </strong>
            {check.fix}
          </p>
        ) : null}
      </div>
      <Badge className={cn("shrink-0", BADGE_STYLES[check.status])}>
        {BADGE_LABELS[check.status]}
      </Badge>
    </div>
  );
}
