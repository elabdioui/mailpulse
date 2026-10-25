import { InboxIcon, SearchXIcon } from "lucide-react";

import { ArchivedTabs } from "@/components/emails/archived-tabs";
import { EmailsFilters } from "@/components/emails/emails-filters";
import { EmailsTable, type EmailTableRow } from "@/components/emails/emails-table";
import { NewEmailDialog } from "@/components/emails/new-email-dialog";
import { StatsCards } from "@/components/emails/stats-cards";
import { EmptyState } from "@/components/empty-state";
import { formatExactFr } from "@/lib/datetime";
import { env } from "@/lib/env";
import { buildPixelUrl } from "@/lib/pixel";
import { listEmails } from "@/lib/services/emails";

export const dynamic = "force-dynamic";

type DashboardSearchParams = Promise<{
  q?: string;
  status?: string;
  archived?: string;
}>;

function isSameLocalDay(date: Date, reference: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date) === formatter.format(reference);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim() : undefined;
  const status =
    sp.status === "opened" || sp.status === "pending" ? sp.status : undefined;
  const archived = sp.archived === "true";

  const [baseline, rows] = await Promise.all([
    listEmails({ archived: false }),
    listEmails({ q, status, archived }),
  ]);

  const total = baseline.length;
  const openedCount = baseline.filter((email) => email.opens > 0).length;
  const openRate = total > 0 ? Math.round((openedCount / total) * 100) : 0;
  const pending = baseline.filter((email) => email.opens === 0).length;
  const now = new Date();
  const openedToday = baseline.filter(
    (email) =>
      email.lastOpenedAt &&
      isSameLocalDay(email.lastOpenedAt, now, env.APP_TIMEZONE),
  ).length;

  const tableRows: EmailTableRow[] = rows.map((row) => ({
    id: row.id,
    label: row.label,
    recipient: row.recipient,
    archived: row.archived,
    opens: row.opens,
    pixelUrl: buildPixelUrl(row.id),
    createdAtIso: row.createdAt.toISOString(),
    createdAtExact: formatExactFr(row.createdAt, env.APP_TIMEZONE),
    lastOpenedAtIso: row.lastOpenedAt ? row.lastOpenedAt.toISOString() : null,
    lastOpenedAtExact: row.lastOpenedAt
      ? formatExactFr(row.lastOpenedAt, env.APP_TIMEZONE)
      : null,
  }));

  const hasActiveFilters = Boolean(q || status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tableau de bord
        </h1>
        <NewEmailDialog />
      </div>

      <StatsCards stats={{ total, openRate, openedToday, pending }} />

      <div className="space-y-4">
        <ArchivedTabs archived={archived} q={q} status={status} />
        <EmailsFilters q={q} status={status} archived={archived} />

        {tableRows.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              icon={SearchXIcon}
              title="Aucun résultat"
              description="Essaie une autre recherche ou retire les filtres actifs."
            />
          ) : archived ? (
            <EmptyState icon={InboxIcon} title="Aucun mail archivé" />
          ) : (
            <EmptyState
              icon={InboxIcon}
              title="Aucun mail suivi pour l'instant"
              description="Crée ton premier suivi pour obtenir un pixel à coller dans Gmail."
              action={<NewEmailDialog />}
            />
          )
        ) : (
          <EmailsTable rows={tableRows} />
        )}
      </div>
    </div>
  );
}
