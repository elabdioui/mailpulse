import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DashboardStats {
  total: number;
  openRate: number;
  openedToday: number;
  pending: number;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Mails trackés" value={String(stats.total)} />
      <StatCard label="Taux d'ouverture" value={`${stats.openRate}%`} />
      <StatCard label="Ouverts aujourd'hui" value={String(stats.openedToday)} />
      <StatCard label="En attente" value={String(stats.pending)} />
    </div>
  );
}
