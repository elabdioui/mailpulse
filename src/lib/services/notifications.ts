import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db, openEvents, trackedEmails } from "@/db";

export const notificationsQuerySchema = z.object({
  since: z.iso.datetime({ offset: true }).optional(),
});
export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;

export const markReadSchema = z.object({
  ids: z.array(z.number().int().positive()).max(500).optional(),
});
export type MarkReadInput = z.infer<typeof markReadSchema>;

export interface NotificationItem {
  id: number;
  emailId: string;
  emailLabel: string;
  openedAt: Date;
  client: string;
}

export interface NotificationsResult {
  count: number;
  notifications: NotificationItem[];
}

export async function listUnreadNotifications(
  since?: Date,
): Promise<NotificationsResult> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(openEvents)
    .where(isNull(openEvents.seenAt));

  const conditions = [isNull(openEvents.seenAt)];
  if (since) conditions.push(gt(openEvents.openedAt, since));

  const notifications = await db
    .select({
      id: openEvents.id,
      emailId: openEvents.emailId,
      emailLabel: trackedEmails.label,
      openedAt: openEvents.openedAt,
      client: openEvents.client,
    })
    .from(openEvents)
    .innerJoin(trackedEmails, eq(trackedEmails.id, openEvents.emailId))
    .where(and(...conditions))
    .orderBy(desc(openEvents.openedAt))
    .limit(50);

  return { count, notifications };
}

export async function markNotificationsRead(
  ids?: number[],
): Promise<number> {
  const now = new Date();
  const condition =
    ids && ids.length > 0
      ? and(inArray(openEvents.id, ids), isNull(openEvents.seenAt))
      : isNull(openEvents.seenAt);

  const updated = await db
    .update(openEvents)
    .set({ seenAt: now })
    .where(condition)
    .returning({ id: openEvents.id });

  return updated.length;
}

/** Marks every unread open of one email as read (viewing its detail page). */
export async function markEmailOpensAsRead(emailId: string): Promise<number> {
  const updated = await db
    .update(openEvents)
    .set({ seenAt: new Date() })
    .where(and(eq(openEvents.emailId, emailId), isNull(openEvents.seenAt)))
    .returning({ id: openEvents.id });

  return updated.length;
}
