// Messages between the content script / popup / options page and the
// service worker, which is the only place that talks to the dashboard API.

export interface TrackEmailRequest {
  type: "track-email";
  sender: string | null;
  recipients: string[];
  subject: string;
  followUpDays: number;
}

export interface TrackEmailResponse {
  ok: true;
  id: string;
  imgTag: string;
}

export interface RecentEmail {
  id: string;
  label: string;
  recipient: string | null;
  opens: number;
  createdAt: string;
  lastOpenedAt: string | null;
}

export type Request =
  | TrackEmailRequest
  | { type: "test-connection" }
  | { type: "recent-emails" }
  | { type: "poll-now" };

export type Failure = { ok: false; error: string };

export type Response<T> = T | Failure;

export async function send<T>(message: Request): Promise<Response<T>> {
  try {
    return (await chrome.runtime.sendMessage(message)) as Response<T>;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
