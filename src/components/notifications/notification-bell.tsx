"use client";

import { BellIcon, MailOpenIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RelativeTime } from "@/components/relative-time";
import { getClientLabel } from "@/lib/client-type";
import { formatExactFr } from "@/lib/datetime";

import { useNotifications } from "./notifications-provider";

const browserTimeZone =
  typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "UTC";

export function NotificationBell() {
  const {
    count,
    items,
    desktopPermission,
    markAllRead,
    requestDesktopPermission,
  } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <BellIcon />
            {count > 0 ? (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full border-transparent px-1 text-[10px]">
                {count > 99 ? "99+" : count}
              </Badge>
            ) : null}
            <span className="sr-only">Notifications</span>
          </Button>
        }
      />
      <PopoverContent className="w-80 p-0" align="end">
        <PopoverHeader className="flex-row items-center justify-between px-3 pt-3">
          <PopoverTitle>Notifications</PopoverTitle>
          {count > 0 ? (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Tout marquer comme lu
            </Button>
          ) : null}
        </PopoverHeader>

        {items.length === 0 ? (
          <p className="px-3 pb-3 text-sm text-muted-foreground">
            Aucune ouverture pour l&apos;instant.
          </p>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="divide-y px-1 pb-1">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/emails/${item.emailId}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                  >
                    <MailOpenIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        « {item.emailLabel} » ouvert
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getClientLabel(item.client)} ·{" "}
                        <RelativeTime
                          iso={item.openedAt}
                          exact={formatExactFr(item.openedAt, browserTimeZone)}
                        />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        {desktopPermission === "default" ? (
          <>
            <Separator />
            <div className="p-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={requestDesktopPermission}
              >
                Activer les notifications du navigateur
              </Button>
            </div>
          </>
        ) : desktopPermission === "granted" ? (
          <>
            <Separator />
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Notifications du navigateur activées.
            </p>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
