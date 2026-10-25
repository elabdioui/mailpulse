import { Badge } from "@/components/ui/badge";

export function StatusBadge({
  opens,
  followUpDue = false,
}: {
  opens: number;
  followUpDue?: boolean;
}) {
  if (opens > 0) {
    return (
      <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
        Ouvert · {opens}×
      </Badge>
    );
  }

  if (followUpDue) {
    return (
      <Badge className="border-transparent bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
        À relancer
      </Badge>
    );
  }

  return <Badge variant="secondary">En attente</Badge>;
}
