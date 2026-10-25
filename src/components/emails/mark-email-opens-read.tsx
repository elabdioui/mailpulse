"use client";

import { useEffect, useRef } from "react";

import { markEmailOpensReadAction } from "@/app/(app)/actions";
import { useNotifications } from "@/components/notifications/notifications-provider";

/** Marks this email's opens as read once, on mount — not during prefetch. */
export function MarkEmailOpensRead({ emailId }: { emailId: string }) {
  const { refresh } = useNotifications();
  const calledFor = useRef<string | null>(null);

  useEffect(() => {
    if (calledFor.current === emailId) return;
    calledFor.current = emailId;

    void markEmailOpensReadAction(emailId).then((updated) => {
      if (updated > 0) refresh();
    });
  }, [emailId, refresh]);

  return null;
}
