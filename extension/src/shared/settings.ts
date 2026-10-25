export type FollowUpChoice = 0 | 1 | 3 | 7;

export interface Settings {
  /** Dashboard origin, e.g. https://mailpulse.vercel.app (no trailing slash). */
  baseUrl: string;
  /** The dashboard's API_TOKEN, sent as a Bearer token. */
  token: string;
  /** Master switch: when off, nothing is tracked and nothing is polled. */
  enabled: boolean;
  /** Pre-selected answer to "relancer si pas ouvert" (0 = non). */
  defaultFollowUp: FollowUpChoice;
}

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: "",
  token: "",
  enabled: true,
  defaultFollowUp: 0,
};

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.local.set(patch);
}

export function isConfigured(settings: Settings): boolean {
  return Boolean(settings.baseUrl && settings.token);
}

/** Normalises what people paste: trims, drops a trailing slash and any path. */
export function normalizeBaseUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
    return url.origin;
  } catch {
    return null;
  }
}
