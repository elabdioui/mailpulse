"use client";

import { ClipboardCopyIcon, LinkIcon, PlusIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { createEmailAction, type CreateEmailState } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { copyImgTagForGmail, copyText } from "@/lib/clipboard";
import type { CreateEmailResult } from "@/lib/services/emails";

export function NewEmailDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<CreateEmailResult | undefined>();
  const formRef = useRef<HTMLFormElement>(null);

  function reset() {
    setError(undefined);
    setResult(undefined);
    formRef.current?.reset();
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setTimeout(reset, 150);
  }

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(undefined);
    const state: CreateEmailState = await createEmailAction({}, formData);
    setIsSubmitting(false);
    if (state.error) setError(state.error);
    else setResult(state.result);
  }

  async function handleCopyForGmail() {
    if (!result) return;
    try {
      await copyImgTagForGmail(result.imgTag);
      toast.success("Pixel copié, prêt à coller dans Gmail");
    } catch {
      toast.error("Impossible de copier automatiquement — utilise « Copier l'URL ».");
    }
  }

  async function handleCopyUrl() {
    if (!result) return;
    try {
      await copyText(result.pixelUrl);
      toast.success("URL du pixel copiée");
    } catch {
      toast.error("Impossible de copier l'URL");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <PlusIcon /> Nouveau suivi
          </Button>
        }
      />
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Suivi créé</DialogTitle>
              <DialogDescription>
                Colle-le à la fin du mail, juste avant d&apos;envoyer.
                N&apos;ouvre pas le mail dans Envoyés.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Button onClick={handleCopyForGmail} size="lg" className="w-full">
                <ClipboardCopyIcon /> Copier pour Gmail
              </Button>
              <Button
                onClick={handleCopyUrl}
                variant="outline"
                className="w-full"
              >
                <LinkIcon /> Copier l&apos;URL
              </Button>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                Terminé
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form ref={formRef} action={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Nouveau suivi</DialogTitle>
              <DialogDescription>
                Crée un pixel de tracking pour un mail que tu vas envoyer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="label">Libellé</Label>
              <Input
                id="label"
                name="label"
                placeholder="Candidature — RH Société X"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient">Destinataire (optionnel)</Label>
              <Input id="recipient" name="recipient" placeholder="rh@societe-x.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Création…" : "Créer le suivi"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
