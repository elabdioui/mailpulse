"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { formatRelativeFr } from "@/lib/datetime";
import { getClientLabel } from "@/lib/client-type";

const POLL_INTERVAL_MS = 20_000;
const BASE_TITLE = "MailPulse";

export interface NotificationItem {
  id: number;
  emailId: string;
  emailLabel: string;
  openedAt: string;
  client: string;
}

interface NotificationsApiResponse {
  count: number;
  notifications: NotificationItem[];
}

interface NotificationsState {
  count: number;
  items: NotificationItem[];
  desktopPermission: NotificationPermission | "unsupported";
  markAllRead: () => void;
  markIds: (ids: number[]) => void;
  refresh: () => void;
  requestDesktopPermission: () => void;
}

const NotificationsContext = createContext<NotificationsState | null>(null);

export function useNotifications(): NotificationsState {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  }
  return ctx;
}

async function postRead(body: { ids?: number[] }): Promise<void> {
  try {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // best-effort — the next poll will reconcile the count anyway
  }
}

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [desktopPermission, setDesktopPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const cursorRef = useRef<string | null>(null);

  useEffect(() => {
    // Reads a browser-only API after mount, deliberately: the server (and
    // the client's first hydration pass) must render "unsupported" so the
    // markup matches, then this syncs the real value once mounted.
    if (typeof window !== "undefined" && "Notification" in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDesktopPermission(Notification.permission);
    }
  }, []);

  const poll = useCallback(async (silent: boolean) => {
    const requestedAt = new Date().toISOString();
    const since = cursorRef.current;
    const url = since
      ? `/api/notifications?since=${encodeURIComponent(since)}`
      : "/api/notifications";

    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store" });
    } catch {
      return;
    }
    if (!response.ok) return;

    const data: NotificationsApiResponse = await response.json();
    setCount(data.count);
    cursorRef.current = requestedAt;

    if (data.notifications.length === 0) {
      if (silent) setItems([]);
      return;
    }

    setItems((prev) => {
      const seen = new Set(prev.map((item) => item.id));
      const fresh = data.notifications.filter((item) => !seen.has(item.id));
      return [...fresh, ...prev].slice(0, 30);
    });

    if (silent) return;

    for (const item of data.notifications) {
      toast(
        `« ${item.emailLabel} » ouvert — ${getClientLabel(item.client)} — ${formatRelativeFr(item.openedAt)}`,
      );
    }

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      for (const item of data.notifications) {
        try {
          new Notification("📬 Mail ouvert", {
            body: `« ${item.emailLabel} » — ${getClientLabel(item.client)}`,
          });
        } catch {
          // Notification constructor can throw in some embedded contexts
        }
      }
    }
  }, []);

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    void poll(true);
  }, [poll]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void poll(false);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  useEffect(() => {
    document.title = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE;
  }, [count]);

  const markAllRead = useCallback(() => {
    setCount(0);
    void postRead({});
  }, []);

  const markIds = useCallback((ids: number[]) => {
    if (ids.length === 0) return;
    setCount((current) => Math.max(0, current - ids.length));
    void postRead({ ids });
  }, []);

  const requestDesktopPermission = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    void Notification.requestPermission().then((permission) => {
      setDesktopPermission(permission);
    });
  }, []);

  const refresh = useCallback(() => {
    void poll(true);
  }, [poll]);

  return (
    <NotificationsContext.Provider
      value={{
        count,
        items,
        desktopPermission,
        markAllRead,
        markIds,
        refresh,
        requestDesktopPermission,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
