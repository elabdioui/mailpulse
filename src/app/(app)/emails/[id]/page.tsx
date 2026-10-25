import { ClockIcon, GlobeIcon, MailOpenIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { EmailRowActions } from "@/components/emails/email-row-actions";
import { InlineEditField } from "@/components/emails/inline-edit-field";
import { StatusBadge } from "@/components/emails/status-badge";
import { EmptyState } from "@/components/empty-state";
import { RelativeTime } from "@/components/relative-time";
import { formatExactFr } from "@/lib/datetime";
import { env } from "@/lib/env";
import { buildPixelUrl } from "@/lib/pixel";
import { getEmailById } from "@/lib/services/emails";
import { getClientLabel } from "@/lib/tracking";

export const dynamic = "force-dynamic";

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const email = await getEmailById(id);
  if (!email) notFound();

  const pixelUrl = buildPixelUrl(email.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <InlineEditField
            emailId={email.id}
            field="label"
            initialValue={email.label}
            required
            className="h-auto border-none p-0 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center gap-2">
            <StatusBadge opens={email.opens} />
            {email.archived ? (
              <span className="text-xs text-muted-foreground">Archivé</span>
            ) : null}
          </div>
        </div>
        <EmailRowActions
          id={email.id}
          label={email.label}
          pixelUrl={pixelUrl}
          archived={email.archived}
          showView={false}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Destinataire
          </label>
          <InlineEditField
            emailId={email.id}
            field="recipient"
            initialValue={email.recipient ?? ""}
            placeholder="rh@societe-x.com"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium text-muted-foreground">
            Notes
          </label>
          <InlineEditField
            emailId={email.id}
            field="notes"
            initialValue={email.notes ?? ""}
            placeholder="Aucune note"
            multiline
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Chronologie des ouvertures
        </h2>

        {email.openEvents.length === 0 ? (
          <EmptyState
            icon={MailOpenIcon}
            title="Pas encore d'ouverture"
            description="Dès que le destinataire ouvrira le mail, l'ouverture apparaîtra ici."
          />
        ) : (
          <ol className="space-y-0 border-l pl-4">
            {email.openEvents.map((open) => (
              <li key={open.id} className="relative pb-5 last:pb-0">
                <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-background bg-emerald-500" />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <RelativeTime
                    iso={open.openedAt.toISOString()}
                    exact={formatExactFr(open.openedAt, env.APP_TIMEZONE)}
                    className="font-medium"
                  />
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <ClockIcon className="size-3.5" />
                    {getClientLabel(open.client)}
                  </span>
                  {open.country ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <GlobeIcon className="size-3.5" />
                      {open.country}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <details className="group rounded-xl border px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground select-none group-open:text-foreground">
          Limites à connaître
        </summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
          <li>Apple Mail précharge souvent les images : une ouverture peut être enregistrée sans lecture réelle.</li>
          <li>Outlook peut bloquer le chargement des images par défaut, et le pixel ne se déclenche pas.</li>
          <li>Gmail met parfois les images en cache, ce qui peut retarder ou masquer une nouvelle ouverture.</li>
        </ul>
      </details>
    </div>
  );
}
