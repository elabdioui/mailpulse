import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const trackedEmails = pgTable("tracked_emails", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  recipient: text("recipient"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  armedAt: timestamp("armed_at", { withTimezone: true }).notNull(),
  archived: boolean("archived").notNull().default(false),
  sender: text("sender"),
  subject: text("subject"),
  source: text("source").notNull().default("manual"),
  followUpAt: timestamp("follow_up_at", { withTimezone: true }),
  followUpNotifiedAt: timestamp("follow_up_notified_at", {
    withTimezone: true,
  }),
});

export const openEvents = pgTable(
  "open_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    emailId: text("email_id")
      .notNull()
      .references(() => trackedEmails.id, { onDelete: "cascade" }),
    openedAt: timestamp("opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    client: text("client").notNull(),
    userAgent: text("user_agent"),
    country: text("country"),
    seenAt: timestamp("seen_at", { withTimezone: true }),
  },
  (table) => [
    index("open_events_email_id_opened_at_idx").on(
      table.emailId,
      table.openedAt.desc(),
    ),
    index("open_events_seen_at_null_idx")
      .on(table.seenAt)
      .where(sql`${table.seenAt} is null`),
  ],
);

export type TrackedEmail = typeof trackedEmails.$inferSelect;
export type NewTrackedEmail = typeof trackedEmails.$inferInsert;
export type OpenEvent = typeof openEvents.$inferSelect;
export type NewOpenEvent = typeof openEvents.$inferInsert;
