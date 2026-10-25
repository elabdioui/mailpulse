/**
 * Pure, client-safe module: no `@/db` or `@/lib/env` imports, so it can be
 * used from both server code (tracking.ts) and client components (the
 * notifications bell) without pulling in server-only dependencies.
 */
export type ClientType =
  | "gmail"
  | "outlook"
  | "yahoo"
  | "apple_or_other"
  | "unknown";

export const CLIENT_LABELS: Record<ClientType, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  yahoo: "Yahoo",
  apple_or_other: "Apple Mail / navigateur",
  unknown: "Client inconnu",
};

export function getClientLabel(client: string): string {
  return CLIENT_LABELS[client as ClientType] ?? client;
}
