import { CheckRow } from "@/components/deliverability/check-row";
import { ManualChecklist } from "@/components/deliverability/manual-checklist";
import { getDeliverabilityReport } from "@/lib/deliverability";

export const dynamic = "force-dynamic";

export default async function DeliverabilityPage() {
  const report = await getDeliverabilityReport();

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Délivrabilité</h1>
        <p className="text-sm text-muted-foreground">
          Rien ici ne garantit qu&apos;un mail n&apos;arrivera jamais en spam,
          mais ces vérifications s&apos;assurent que le pixel reste neutre et
          n&apos;ajoute aucun signal négatif.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Vérifications automatiques
        </h2>
        <div className="space-y-2">
          {report.checks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Checklist manuelle
        </h2>
        <ManualChecklist />
      </div>
    </div>
  );
}
