"use client";

import { AlertTriangleIcon } from "lucide-react";
import { useEffect } from "react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={AlertTriangleIcon}
      title="Une erreur est survenue"
      description="Impossible de charger cette page pour le moment. Réessaie dans quelques instants."
      action={<Button onClick={reset}>Réessayer</Button>}
    />
  );
}
