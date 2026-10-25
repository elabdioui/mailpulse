import type {
  Failure,
  RecentEmail,
  Request,
  TrackEmailRequest,
  TrackEmailResponse,
} from "./shared/messages";
import { getSettings, isConfigured, type Settings } from "./shared/settings";

const POLL_ALARM = "mailpulse-poll";
const POLL_PERIOD_MINUTES = 5;
const LABEL_MAX = 200;

class ApiError extends Error {}

async function api<T>(
  settings: Settings,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: globalThis.Response;
  try {
    response = await fetch(`${settings.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${settings.token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Tableau de bord injoignable. Vérifie l'URL et l'autorisation d'accès dans les options.",
    );
  }
  if (response.status === 401) throw new ApiError("Token API refusé.");
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? `Erreur ${response.status}`);
  }
  return (await response.json()) as T;
}

async function trackEmail(
  settings: Settings,
  request: TrackEmailRequest,
): Promise<TrackEmailResponse> {
  const subject = request.subject.trim();
  const label = (subject || "(sans objet)").slice(0, LABEL_MAX);
  const created = await api<{ id: string; imgTag: string }>(settings, "/api/emails", {
    method: "POST",
    body: JSON.stringify({
      label,
      subject: subject || undefined,
      recipient: request.recipients.join(", ").slice(0, 1000) || undefined,
      sender: request.sender ?? undefined,
      source: "extension",
      followUpDays: request.followUpDays > 0 ? request.followUpDays : undefined,
    }),
  });
  return { ok: true, id: created.id, imgTag: created.imgTag };
}

async function recentEmails(settings: Settings): Promise<RecentEmail[]> {
  const { emails } = await api<{ emails: RecentEmail[] }>(settings, "/api/emails");
  return emails.slice(0, 5);
}

// --- Polling: new opens and due follow-ups become desktop notifications.

interface NotificationsPayload {
  count: number;
  notifications: Array<{ id: number; emailId: string; emailLabel: string; client: string }>;
}
interface FollowUpsPayload {
  followUps: Array<{ id: string; label: string; recipient: string | null }>;
}

const CLIENT_LABELS: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  yahoo: "Yahoo",
  apple_or_other: "Apple Mail / navigateur",
  unknown: "client inconnu",
};

function notify(id: string, title: string, message: string): void {
  chrome.notifications.create(id, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title,
    message,
    priority: 1,
  });
}

async function poll(): Promise<void> {
  const settings = await getSettings();
  if (!settings.enabled || !isConfigured(settings)) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }

  const { lastPollAt } = (await chrome.storage.local.get("lastPollAt")) as {
    lastPollAt?: string;
  };
  const startedAt = new Date().toISOString();

  try {
    // First run: only remember the starting point, don't replay history.
    if (lastPollAt) {
      const opens = await api<NotificationsPayload>(
        settings,
        `/api/notifications?since=${encodeURIComponent(lastPollAt)}`,
      );
      for (const open of opens.notifications.slice(0, 10)) {
        notify(
          `open:${open.emailId}:${open.id}`,
          "Mail ouvert",
          `« ${open.emailLabel} » vient d'être ouvert (${CLIENT_LABELS[open.client] ?? open.client}).`,
        );
      }
      await chrome.action.setBadgeText({ text: opens.count > 0 ? String(opens.count) : "" });
    }
    await chrome.storage.local.set({ lastPollAt: startedAt });

    const { followUps } = await api<FollowUpsPayload>(settings, "/api/follow-ups");
    if (followUps.length > 0) {
      for (const followUp of followUps.slice(0, 10)) {
        notify(
          `follow-up:${followUp.id}`,
          "À relancer",
          `« ${followUp.label} »${followUp.recipient ? ` (${followUp.recipient})` : ""} n'a toujours pas été ouvert.`,
        );
      }
      await api(settings, "/api/follow-ups/read", {
        method: "POST",
        body: JSON.stringify({ ids: followUps.map((followUp) => followUp.id) }),
      });
    }
  } catch (error) {
    console.warn("[mailpulse] poll failed", error);
  }
}

chrome.notifications.onClicked.addListener(async (notificationId) => {
  const emailId = notificationId.split(":")[1];
  const settings = await getSettings();
  if (emailId && settings.baseUrl) {
    await chrome.tabs.create({ url: `${settings.baseUrl}/emails/${emailId}` });
  }
  chrome.notifications.clear(notificationId);
});

function ensureAlarm(): void {
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_PERIOD_MINUTES });
}
chrome.runtime.onInstalled.addListener((details) => {
  ensureAlarm();
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(ensureAlarm);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) void poll();
});
chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });

// --- Message router.

async function handle(request: Request): Promise<unknown> {
  const settings = await getSettings();
  if (request.type !== "poll-now" && !isConfigured(settings)) {
    throw new ApiError("Extension non configurée : ouvre les options de MailPulse.");
  }
  switch (request.type) {
    case "track-email":
      return trackEmail(settings, request);
    case "test-connection":
      await api(settings, "/api/follow-ups");
      return { ok: true };
    case "recent-emails":
      return { ok: true, emails: await recentEmails(settings) };
    case "poll-now":
      await poll();
      return { ok: true };
  }
}

chrome.runtime.onMessage.addListener((request: Request, _sender, sendResponse) => {
  handle(request).then(sendResponse, (error: unknown) => {
    const failure: Failure = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    sendResponse(failure);
  });
  return true; // async response
});
