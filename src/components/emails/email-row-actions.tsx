"use client";

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CopyIcon,
  EyeIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteEmailAction, setArchivedAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyText } from "@/lib/clipboard";

export function EmailRowActions({
  id,
  label,
  pixelUrl,
  archived,
  showView = true,
}: {
  id: string;
  label: string;
  pixelUrl: string;
  archived: boolean;
  showView?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleCopyPixel() {
    copyText(pixelUrl)
      .then(() => toast.success("URL du pixel copiée"))
      .catch(() => toast.error("Impossible de copier l'URL"));
  }

  function handleToggleArchived() {
    startTransition(async () => {
      await setArchivedAction(id, !archived);
      toast.success(archived ? "Mail restauré" : "Mail archivé");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteEmailAction(id);
      toast.success("Mail supprimé");
      setConfirmOpen(false);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontalIcon />
              <span className="sr-only">Actions</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {showView ? (
            <DropdownMenuItem render={<Link href={`/emails/${id}`} />}>
              <EyeIcon /> Voir
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={handleCopyPixel}>
            <CopyIcon /> Copier le pixel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleArchived} disabled={isPending}>
            {archived ? (
              <>
                <ArchiveRestoreIcon /> Désarchiver
              </>
            ) : (
              <>
                <ArchiveIcon /> Archiver
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2Icon /> Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer « {label} » ?</DialogTitle>
            <DialogDescription>
              Cette action supprime aussi tout l&apos;historique d&apos;ouvertures
              de ce mail. Elle est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
