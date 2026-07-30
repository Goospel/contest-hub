CREATE TABLE "contests" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_url" text NOT NULL,
	"title" text NOT NULL,
	"organizer" text,
	"category" text[] DEFAULT '{}' NOT NULL,
	"target" text,
	"prize" text,
	"description" text,
	"thumbnail_url" text,
	"starts_at" date,
	"deadline" date,
	"dedupe_key" text NOT NULL,
	"status" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "contests_dedupe_key_idx" ON "contests" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "contests_status_deadline_idx" ON "contests" USING btree ("status","deadline");