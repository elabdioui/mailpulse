"use client";

import { useEffect, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "mailpulse:deliverability-checklist";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href?: string;
  linkLabel?: string;
}

const ITEMS: ChecklistItem[] = [
  {
    id: "blacklist",
    label: "Domaine vérifié sur une liste noire",
    description:
      "Vérifie que ton domaine n'apparaît sur aucune liste noire d'envoi.",
    href: "https://mxtoolbox.com/blacklists.aspx",
    linkLabel: "Ouvrir MXToolbox Blacklist Check",
  },
  {
    id: "mail-tester",
    label: "Test d'envoi avec mail-tester.com",
    description:
      "Envoie un vrai mail avec le pixel à l'adresse fournie par mail-tester.com et vise une note de 9/10 ou plus.",
    href: "https://www.mail-tester.com/",
    linkLabel: "Ouvrir mail-tester.com",
  },
  {
    id: "spf-dkim-dmarc",
    label: "SPF/DKIM/DMARC en PASS dans Gmail",
    description:
      "Dans Gmail, ouvre le mail envoyé puis « Afficher l'original » et vérifie que SPF, DKIM et DMARC sont tous en PASS.",
  },
];

export function ManualChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Reads localStorage after mount, deliberately: the server (and the
    // client's first hydration pass) must render every box unchecked so
    // the markup matches, then this syncs the real saved state.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setChecked(JSON.parse(raw));
      }
    } catch {
      // corrupted or unavailable storage — keep the defaults
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {
      // storage unavailable (private browsing, quota) — nothing we can do
    }
  }, [checked, loaded]);

  return (
    <div className="space-y-2">
      {ITEMS.map((item) => (
        <div key={item.id} className="flex items-start gap-3 rounded-xl border p-4">
          <Checkbox
            id={item.id}
            checked={checked[item.id] ?? false}
            onCheckedChange={(value: boolean) =>
              setChecked((prev) => ({ ...prev, [item.id]: value }))
            }
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label htmlFor={item.id} className="font-medium">
              {item.label}
            </Label>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="block text-sm text-primary underline underline-offset-4"
              >
                {item.linkLabel}
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
