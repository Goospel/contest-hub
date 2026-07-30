import {
  date,
  index,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const SOURCES = ["wevity", "llm-search"] as const;
export const STATUSES = ["published", "pending", "expired"] as const;

export type Source = (typeof SOURCES)[number];
export type Status = (typeof STATUSES)[number];

export const contests = pgTable(
  "contests",
  {
    id: serial("id").primaryKey(),

    source: text("source", { enum: SOURCES }).notNull(),
    sourceUrl: text("source_url").notNull(),

    title: text("title").notNull(),
    organizer: text("organizer"),
    category: text("category").array().notNull().default([]),
    target: text("target"),
    prize: text("prize"),
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),

    startsAt: date("starts_at"),
    deadline: date("deadline"),

    /** 동일성의 단일 출처. source_url 에는 unique 를 걸지 않는다 — 같은 공모전을
     *  두 소스가 다른 URL로 가져오면 upsert 가 제약 위반으로 깨진다. */
    dedupeKey: text("dedupe_key").notNull(),

    status: text("status", { enum: STATUSES }).notNull(),

    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("contests_dedupe_key_idx").on(t.dedupeKey),
    // 목록의 기본 정렬이 마감 임박순이고 status 로 먼저 걸러낸다
    index("contests_status_deadline_idx").on(t.status, t.deadline),
  ],
);

export type Contest = typeof contests.$inferSelect;
export type NewContest = typeof contests.$inferInsert;
