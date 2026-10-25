import { Badge } from "@/components/ui/badge";

export function StatusBadge({ opens }: { opens: number }) {
  if (opens > 0) {
    return (
      <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
        Ouvert · {opens}×
      </Badge>
    );
  }

  return <Badge variant="secondary">En attente</Badge>;
}
