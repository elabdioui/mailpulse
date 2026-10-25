import { and, eq, gte } from "drizzle-orm";

import { db, openEvents, trackedEmails } from "@/db";
import { env } from "@/lib/env";

export type ClientType =
  | "gmail"
  | "outlook"
  | "yahoo"
  | "apple_or_other"
  | "unknown";

/** Reserved id used by the deliverability self-check; never recorded. */
export const HEALTHCHECK_ID = "healthcheck";

export const USER_AGENT_MAX_LENGTH = 300;

const GIF_EXTENSION = ".gif";

/** Strips the optional `.gif` suffix from the raw route param. */
export function normalizePixelId(rawId: string): string {
  return rawId.endsWith(GIF_EXTENSION)
    ? rawId.slice(0, -GIF_EXTENSION.length)
    : rawId;
}

export function classifyClient(
  userAgent: string | null | undefined,
): ClientType {
  if (!userAgent || userAgent.trim() === "") return "unknown";
  if (userAgent.includes("GoogleImageProxy")) return "gmail";
  if (userAgent.includes("YahooMailProxy")) return "yahoo";
  if (/Outlook|Microsoft Office|ms-office/i.test(userAgent)) return "outlook";
  return "apple_or_other";
}

export function truncateUserAgent(
  userAgent: string | null | undefined,
): string | null {
  if (!userAgent) return null;
  return userAgent.slice(0, USER_AGENT_MAX_LENGTH);
}

/** Opens before `armedAt` are the sender's own loads while drafting. */
export function isArmed(now: Date, armedAt: Date): boolean {
  return now.getTime() >= armedAt.getTime();
}

export interface RecentOpen {
  client: string;
  openedAt: Date;
}

/** True if an open from the same client already exists within the dedup window. */
export function isDuplicateOpen(
  recentOpens: RecentOpen[],
  client: ClientType,
  now: Date,
  dedupWindowSeconds: number,
): boolean {
  const windowStart = now.getTime() - dedupWindowSeconds * 1000;
  return recentOpens.some(
    (open) =>
      open.client === client && open.openedAt.getTime() >= windowStart,
  );
}

export interface RecordOpenInput {
  id: string;
  userAgent: string | null;
  country: string | null;
  now?: Date;
}

/**
 * Records a pixel open in the background. Never throws: every failure
 * (unknown id, db unavailable, ...) is caught and logged so the pixel
 * response is never affected.
 */
export async function recordOpen({
  id,
  userAgent,
  country,
  now = new Date(),
}: RecordOpenInput): Promise<void> {
  try {
    if (id === HEALTHCHECK_ID) return;

    const email = await db.query.trackedEmails.findFirst({
      where: eq(trackedEmails.id, id),
    });
    if (!email) return;

    if (!isArmed(now, email.armedAt)) return;

    const client = classifyClient(userAgent);
    const windowStart = new Date(
      now.getTime() - env.DEDUP_WINDOW_SECONDS * 1000,
    );
    const recentOpens = await db.query.openEvents.findMany({
      where: and(
        eq(openEvents.emailId, id),
        gte(openEvents.openedAt, windowStart),
      ),
      columns: { client: true, openedAt: true },
    });

    if (isDuplicateOpen(recentOpens, client, now, env.DEDUP_WINDOW_SECONDS)) {
      return;
    }

    await db.insert(openEvents).values({
      emailId: id,
      client,
      userAgent: truncateUserAgent(userAgent),
      country,
      openedAt: now,
    });
  } catch (error) {
    console.error("[tracking] failed to record open event", error);
  }
}
