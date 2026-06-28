import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const googleTokensTable = pgTable("google_tokens", {
  id: serial("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry", { withTimezone: true }),
  email: text("email"),
  calendarId: text("calendar_id").notNull().default("primary"),
  syncEnabled: boolean("sync_enabled").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type GoogleTokens = typeof googleTokensTable.$inferSelect;
