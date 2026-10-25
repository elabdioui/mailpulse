import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { db, openEvents, trackedEmails } from "@/db";
import { env } from "@/lib/env";
import { buildImgTag, buildPixelUrl } from "@/lib/pixel";

export const createEmailSchema = z.object({
  label: z.string().trim().min(1, "Le libellé est requis").max(200),
  recipient: z.string().trim().max(320).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateEmailInput = z.infer<typeof createEmailSchema>;

export const updateEmailSchema = z
  .object({
    label: z.string().trim().min(1, "Le libellé est requis").max(200).optional(),
    recipient: z.string().trim().max(320).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    archived: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Aucune modification fournie",
  });
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;

export const listEmailsQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  status: z.enum(["opened", "pending"]).optional(),
  archived: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});
export type ListEmailsQuery = z.infer<typeof listEmailsQuerySchema>;

export interface CreateEmailResult {
  id: string;
  pixelUrl: string;
  imgTag: string;
}

export async function createEmail(
  input: CreateEmailInput,
): Promise<CreateEmailResult> {
  const id = nanoid(21);
  const now = new Date();
  const armedAt = new Date(now.getTime() + env.GRACE_PERIOD_SECONDS * 1000);

  await db.insert(trackedEmails).values({
    id,
    label: input.label,
    recipient: input.recipient || null,
    notes: input.notes || null,
    createdAt: now,
    armedAt,
    archived: false,
  });

  const pixelUrl = buildPixelUrl(id);
  return { id, pixelUrl, imgTag: buildImgTag(pixelUrl) };
}

export interface EmailListItem {
  id: string;
  label: string;
  recipient: string | null;
  notes: string | null;
  createdAt: Date;
  armedAt: Date;
  archived: boolean;
  opens: number;
  firstOpenedAt: Date | null;
  lastOpenedAt: Date | null;
}

export async function listEmails(
  query: ListEmailsQuery,
): Promise<EmailListItem[]> {
  const conditions: SQL[] = [
    eq(trackedEmails.archived, query.archived ?? false),
  ];

  if (query.q) {
    const pattern = `%${query.q}%`;
    conditions.push(
      or(
        ilike(trackedEmails.label, pattern),
        ilike(trackedEmails.recipient, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      id: trackedEmails.id,
      label: trackedEmails.label,
      recipient: trackedEmails.recipient,
      notes: trackedEmails.notes,
      createdAt: trackedEmails.createdAt,
      armedAt: trackedEmails.armedAt,
      archived: trackedEmails.archived,
      opens: sql<number>`count(${openEvents.id})::int`,
      firstOpenedAt: sql<Date | null>`min(${openEvents.openedAt})`,
      lastOpenedAt: sql<Date | null>`max(${openEvents.openedAt})`,
    })
    .from(trackedEmails)
    .leftJoin(openEvents, eq(openEvents.emailId, trackedEmails.id))
    .where(and(...conditions))
    .groupBy(trackedEmails.id)
    .orderBy(desc(trackedEmails.createdAt));

  if (query.status === "opened") return rows.filter((row) => row.opens > 0);
  if (query.status === "pending") return rows.filter((row) => row.opens === 0);
  return rows;
}

export interface EmailDetail extends EmailListItem {
  openEvents: Array<{
    id: number;
    openedAt: Date;
    client: string;
    country: string | null;
  }>;
}

export async function getEmailById(id: string): Promise<EmailDetail | null> {
  const email = await db.query.trackedEmails.findFirst({
    where: eq(trackedEmails.id, id),
  });
  if (!email) return null;

  const opens = await db.query.openEvents.findMany({
    where: eq(openEvents.emailId, id),
    orderBy: desc(openEvents.openedAt),
  });

  return {
    ...email,
    opens: opens.length,
    firstOpenedAt: opens.length ? opens[opens.length - 1].openedAt : null,
    lastOpenedAt: opens.length ? opens[0].openedAt : null,
    openEvents: opens.map((open) => ({
      id: open.id,
      openedAt: open.openedAt,
      client: open.client,
      country: open.country,
    })),
  };
}

export async function updateEmail(
  id: string,
  patch: UpdateEmailInput,
): Promise<typeof trackedEmails.$inferSelect | null> {
  const updateData: Partial<typeof trackedEmails.$inferInsert> = {};
  if (patch.label !== undefined) updateData.label = patch.label;
  if (patch.recipient !== undefined) updateData.recipient = patch.recipient;
  if (patch.notes !== undefined) updateData.notes = patch.notes;
  if (patch.archived !== undefined) updateData.archived = patch.archived;

  const [updated] = await db
    .update(trackedEmails)
    .set(updateData)
    .where(eq(trackedEmails.id, id))
    .returning();

  return updated ?? null;
}

export async function deleteEmail(id: string): Promise<boolean> {
  const deleted = await db
    .delete(trackedEmails)
    .where(eq(trackedEmails.id, id))
    .returning({ id: trackedEmails.id });
  return deleted.length > 0;
}
