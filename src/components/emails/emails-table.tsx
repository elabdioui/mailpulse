import Link from "next/link";

import { EmailRowActions } from "@/components/emails/email-row-actions";
import { StatusBadge } from "@/components/emails/status-badge";
import { RelativeTime } from "@/components/relative-time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface EmailTableRow {
  id: string;
  label: string;
  recipient: string | null;
  archived: boolean;
  opens: number;
  pixelUrl: string;
  createdAtIso: string;
  createdAtExact: string;
  lastOpenedAtIso: string | null;
  lastOpenedAtExact: string | null;
}

export function EmailsTable({ rows }: { rows: EmailTableRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Libellé</TableHead>
            <TableHead>Destinataire</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Créé</TableHead>
            <TableHead>Dernière ouverture</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="max-w-56 truncate font-medium">
                <Link
                  href={`/emails/${row.id}`}
                  className="hover:underline"
                >
                  {row.label}
                </Link>
              </TableCell>
              <TableCell className="max-w-48 truncate text-muted-foreground">
                {row.recipient ?? "—"}
              </TableCell>
              <TableCell>
                <StatusBadge opens={row.opens} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                <RelativeTime
                  iso={row.createdAtIso}
                  exact={row.createdAtExact}
                />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.lastOpenedAtIso ? (
                  <RelativeTime
                    iso={row.lastOpenedAtIso}
                    exact={row.lastOpenedAtExact ?? ""}
                  />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <EmailRowActions
                  id={row.id}
                  label={row.label}
                  pixelUrl={row.pixelUrl}
                  archived={row.archived}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
