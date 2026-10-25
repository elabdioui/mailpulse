import { MailXIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export default function EmailNotFound() {
  return (
    <EmptyState
      icon={MailXIcon}
      title="Ce mail suivi n'existe pas"
      description="Il a peut-être été supprimé."
      action={
        <Button render={<Link href="/" />} variant="outline">
          Retour au tableau de bord
        </Button>
      }
    />
  );
}
