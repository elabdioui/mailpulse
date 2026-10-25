ALTER TABLE "tracked_emails" ADD COLUMN "sender" text;--> statement-breakpoint
ALTER TABLE "tracked_emails" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "tracked_emails" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "tracked_emails" ADD COLUMN "follow_up_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tracked_emails" ADD COLUMN "follow_up_notified_at" timestamp with time zone;