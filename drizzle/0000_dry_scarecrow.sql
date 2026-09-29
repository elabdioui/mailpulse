CREATE TABLE "open_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email_id" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client" text NOT NULL,
	"user_agent" text,
	"country" text,
	"seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tracked_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"recipient" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"armed_at" timestamp with time zone NOT NULL,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "open_events" ADD CONSTRAINT "open_events_email_id_tracked_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."tracked_emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "open_events_email_id_opened_at_idx" ON "open_events" USING btree ("email_id","opened_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "open_events_seen_at_null_idx" ON "open_events" USING btree ("seen_at") WHERE "open_events"."seen_at" is null;